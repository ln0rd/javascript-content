import chai, { expect, should } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import 'sinon-mongoose'

import Mcc from 'application/core/models/mcc-pricing'
import Company from 'application/core/models/company'
import Affiliation from 'application/core/models/affiliation'
import Provider from 'application/core/models/provider'
import User from 'application/core/models/user'

import * as Connector from 'application/core/providers/connector'
import CompanyService from 'application/core/services/company'
import AffiliationService from 'application/core/services/affiliation'
import { affiliationResponder } from 'application/core/responders/affiliation'
import { generateAffiliation, generateCompany } from 'test/fixtures'
import { feeRule as MockFeeRule } from 'test/mocks/fee-rule'
import { ECOMMERCE, EMV, MAGSTRIPE } from 'application/core/domain/methods'
import ValidationError from 'framework/core/errors/validation-error'
import EcommerceCaptureMethodNotAllowed from 'application/core/errors/ecommerce-capture-method-not-allowed'
import * as sendWebHook from 'application/webhook/helpers/deliverer'
import frameworkConfig from 'framework/core/config'
import mongoose from 'mongoose'

should()
chai.use(chaiAsPromised)

describe('Unit => Services: Affiliation', () => {
  context('create', async () => {
    // Sinon sandbox do not work with sinon-mongoose as of
    // sinon 7.3.0 and 2.3.0
    afterEach(function() {
      sinon.restore()
    })

    /*it('throws AffiliationAlreadyExistsError when the company already has an affiliation for a given provider', async () => {

    })*/

    // Input parameters for AffiliationService.create
    function createAffiliationInput() {
      return {
        locale: frameworkConfig.core.i18n.defaultLocale,
        params: {
          provider: 'hash',
          create_merchant: true,
          activation_email: false,
          allowed_capture_methods: ['emv'],
          allowed_payment_methods: ['credit_card', 'debit_card'],
          internal_provider: 'pags',
          chargeback_handling_policy:
            'chargeback_responsibility_proportional_to_split'
        },
        companyId: mongoose.Types.ObjectId()
      }
    }

    // Utility function to mock mongoose models and stub services that are not
    // what we are verifying in the tests for this context
    function mockAndStub(
      input,
      affiliationOverrides = {},
      stubConnector = true
    ) {
      const company = generateCompany(input.companyId)
      const isoCompany = {
        _id: company.parent_id
      }
      const affiliation = Object.assign(
        generateAffiliation({
          _id: mongoose.Types.ObjectId(),
          provider: input.params.provider
        }),
        affiliationOverrides
      )

      const provider = {
        _id: mongoose.Types.ObjectId()
      }
      const subacquirerProviderStub = {
        async affiliateMerchant(provider, _, internal_provider) {
          return {
            merchant_id: 'unique-merchant-id',
            internal_provider,
            provider_id: provider._id,
            internal_merchant_id: 'internal-provider-merchant-id',
            wallet_id: affiliation.wallet_id,
            status: affiliation.status,
            provider_status_message: affiliation.provider_status_message,
            enabled: affiliation.enabled
          }
        }
      }

      const companyMock = sinon.mock(Company)
      companyMock
        .expects('findOne')
        .once()
        .withExactArgs({
          _id: input.companyId
        })
        .chain('lean')
        .chain('exec')
        .resolves(company)

      // Called in getIsoAccount()
      companyMock
        .expects('findOne')
        .once()
        .withExactArgs({
          _id: company.parent_id
        })
        .resolves(isoCompany)

      const affiliationMock = sinon.mock(Affiliation)

      // Called in checkAffiliation()
      affiliationMock
        .expects('findOne')
        .once()
        .withExactArgs({
          company_id: input.companyId,
          provider: input.params.provider
        })
        .chain('lean')
        .chain('exec')
        // Affiliation doesn't exists
        .resolves(null)

      // Called in setInternalMerchantID -> getIsoAffiliation
      affiliationMock
        .expects('findOne')
        .once()
        .withExactArgs({
          company_id: isoCompany._id,
          internal_provider: input.params.internal_provider
        })
        .resolves({
          internal_merchant_id: 'iso-affiliation-internal-merchant-id'
        })

      // For the tests below we are not validating this behavior
      sinon.stub(Affiliation, 'create').resolves(affiliation)

      sinon
        .stub(AffiliationService, 'validateAllowedCaptureMethod')
        .resolves(input.allowed_capture_methods)

      sinon
        .mock(Mcc, 'findOne')
        .expects('findOne')
        .withArgs({
          company_id: company.parent_id,
          mcc: company.mcc
        })
        .chain('lean')
        .chain('exec')
        .resolves({
          _id: mongoose.Types.ObjectId(),
          mcc: '7399',
          provider: 'hash',
          company_id: company.parent_id
        })

      sinon
        .mock(Provider, 'findOne')
        .expects('findOne')
        .withArgs({
          name: input.params.provider,
          enabled: true
        })
        .chain('lean')
        .chain('exec')
        .resolves(provider)

      const user = new User({
        _id: mongoose.Types.ObjectId(),
        status: 'active'
      })
      sinon.stub(CompanyService, 'activateUser').resolves(user)

      const userMock = sinon.mock(user)
      user.user_metadata = { type: 'admin' }
      userMock.expects('save').resolves(true)

      if (stubConnector) {
        sinon.stub(Connector, 'default').returns(subacquirerProviderStub)
      }

      return {
        company,
        affiliation,
        provider
      }
    }

    it('sends `affiliation_approved` webhook when provider allows the affiliation', async () => {
      const input = createAffiliationInput()
      const { affiliation, company } = mockAndStub(input, {
        status: 'active',
        enabled: true,
        provider_status_message: 'Aprovado'
      })

      const sendWebHookMock = sinon
        .mock(sendWebHook)
        .expects('default')
        .withExactArgs(
          company.parent_id, // companyId
          'affiliation_approved', // eventName
          'affiliation', // modelName
          affiliation._id, // modelId
          'pending_approval', // oldStatus
          'active', //currentStatus
          affiliationResponder(affiliation) // payload
        )

      await AffiliationService.create(
        input.locale,
        input.params,
        input.companyId
      )

      sendWebHookMock.verify()
    })

    it('sends `affiliation_rejected` webhook when provider denies the affiliation', async () => {
      const input = createAffiliationInput()
      const { affiliation, company } = mockAndStub(input, {
        status: 'blocked',
        enabled: false,
        provider_status_message: 'Recusado'
      })

      const sendWebHookMock = sinon
        .mock(sendWebHook)
        .expects('default')
        .withExactArgs(
          company.parent_id, // companyId
          'affiliation_rejected', // eventName
          'affiliation', // modelName
          affiliation._id, // modelId
          'pending_approval', // oldStatus
          'blocked', //currentStatus
          affiliationResponder(affiliation) // payload
        )

      await AffiliationService.create(
        input.locale,
        input.params,
        input.companyId
      )

      sendWebHookMock.verify()
    })

    it('should not create affiliation with company.name with incorrect value', async () => {
      const input = createAffiliationInput()
      const { company } = mockAndStub(
        input,
        {
          status: 'active',
          enabled: true,
          provider_status_message: 'Aprovado'
        },
        false
      )

      company.name = ''
      await AffiliationService.create(
        input.locale,
        input.params,
        input.companyId
      ).catch(err => {
        expect(err.parameterName).to.be.equal('name')
        expect(err.schema.minLength).to.be.true
      })
    })

    it('should raise ValidationError if internal_provider is missing from params', async () => {
      const input = createAffiliationInput()
      delete input.params['internal_provider']

      mockAndStub(input, {
        status: 'active',
        enabled: true,
        provider_status_message: 'Aprovado'
      })

      return expect(
        AffiliationService.create(input.locale, input.params, input.companyId)
      ).to.eventually.rejectedWith(
        ValidationError,
        'O paramêtro internal_provider é obrigatório.'
      )
    })
  })

  context('handleAllowedCaptureMethodChanges', () => {
    it('should allow to set ecommerce capture method in allowed_capture_methods params with boleto_pricing configured in affiliation and fee_rule', () => {
      const affiliation = generateAffiliation({})
      const feeRule = MockFeeRule()
      const params = {
        allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
      }
      const allowed_capture_methods = AffiliationService.handleAllowedCaptureMethodChanges(
        params.allowed_capture_methods,
        affiliation,
        feeRule
      )
      const hasEcommerce = allowed_capture_methods.some(
        method => method === ECOMMERCE
      )
      expect(hasEcommerce).to.be.true
    })

    context(
      'Given invalid data to not allow the insertion of ecommerce in the insertion of ecommerce in allowed_capture_methods',
      () => {
        it('should not allow without affiliation', () => {
          const affiliation = {}
          const feeRule = MockFeeRule()
          const params = {
            allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
          }
          feeRule.boleto_pricing = undefined
          expect(() =>
            AffiliationService.handleAllowedCaptureMethodChanges(
              params.allowed_capture_methods,
              affiliation,
              feeRule
            ).to.throw(EcommerceCaptureMethodNotAllowed)
          )
        })

        it('should not allow without fee_rule', () => {
          const affiliation = generateAffiliation({})
          const feeRule = {}
          const params = {
            allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
          }

          expect(() =>
            AffiliationService.handleAllowedCaptureMethodChanges(
              params.allowed_capture_methods,
              affiliation,
              feeRule
            ).to.throw(EcommerceCaptureMethodNotAllowed)
          )
        })

        it('should not allow with boleto_pricing misconfigured in affiliation', () => {
          const affiliation = generateAffiliation({ boleto_pricing: {} })
          const feeRule = MockFeeRule()
          const params = {
            allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
          }

          expect(() =>
            AffiliationService.handleAllowedCaptureMethodChanges(
              params.allowed_capture_methods,
              affiliation,
              feeRule
            ).to.throw(EcommerceCaptureMethodNotAllowed)
          )
        })

        it('should not allow with boleto_pricing misconfigured in fee_rule', () => {
          const affiliation = generateAffiliation({})
          const feeRule = MockFeeRule()
          feeRule.boleto_pricing = undefined

          const params = {
            allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
          }

          expect(() =>
            AffiliationService.handleAllowedCaptureMethodChanges(
              params.allowed_capture_methods,
              affiliation,
              feeRule
            ).to.throw(EcommerceCaptureMethodNotAllowed)
          )
        })

        it('should not allow with boleto_pricing without affiliation and fee_rule data', () => {
          const affiliation = {}
          const feeRule = {}

          const params = {
            allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE]
          }

          expect(() =>
            AffiliationService.handleAllowedCaptureMethodChanges(
              params.allowed_capture_methods,
              affiliation,
              feeRule
            ).to.throw(EcommerceCaptureMethodNotAllowed)
          )
        })
      }
    )
  })
})
