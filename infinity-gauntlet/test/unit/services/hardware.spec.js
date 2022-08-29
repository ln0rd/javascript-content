import sinon from 'sinon'
import 'sinon-mongoose'

import * as sendWebHook from 'application/webhook/helpers/deliverer'
import frameworkConfig from 'framework/core/config'
import Company from 'application/core/models/company'
import Affiliation from 'application/core/models/affiliation'
import Hardware from 'application/core/models/capture-hardware'
import HardwareService from 'application/core/services/hardware'
import { hardwareResponder } from 'application/core/responders/hardware'
import * as CompanyStatus from 'application/core/domain/company-status'
import * as Connector from 'application/core/providers/connector'
import mongoose from 'mongoose'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import AffiliationDisabledError from 'application/core/errors/affiliation-disabled-error'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Unit => Services: Hardware', () => {
  let companyMock
  let hardwareMock
  let affiliationMock

  beforeEach(function() {
    companyMock = sinon.mock(Company)
    hardwareMock = sinon.mock(Hardware)
    affiliationMock = sinon.mock(Affiliation)
  })

  // Sinon sandbox do not work with sinon-mongoose as of
  // sinon 7.3.0 and 2.3.0
  afterEach(() => {
    sinon.restore()
  })

  context('create', () => {
    function createHardwareInput() {
      return {
        locale: frameworkConfig.core.i18n.defaultLocale,
        params: {
          serial_number: '1470002094',
          provider: 'hash',
          terminal_type: 'pos',
          software_provider: 'hash_capture',
          hardware_provider: 'pax',
          terminal_model: 'd195'
        },
        companyId: mongoose.Types.ObjectId()
      }
    }

    function mockCompanyHardwareAffiliation(
      input,
      company,
      hardware,
      affiliation
    ) {
      // First call to getCompany()
      companyMock
        .expects('findOne')
        .once()
        .withExactArgs({
          _id: input.companyId
        })
        .chain('lean')
        .chain('exec')
        .resolves(company)

      // getHardwareBySerial()
      hardwareMock
        .expects('findOne')
        .once()
        .withExactArgs({
          serial_number: input.params.serial_number,
          status: { $ne: 'disabled' }
        })
        .chain('lean')
        .chain('exec')
        // Should be null or else create throws SerialNumberAlreadyExistsError
        .resolves(hardware)

      // sendToProvider()
      affiliationMock
        .expects('findOne')
        .once()
        .withExactArgs({
          company_id: input.companyId,
          provider: input.params.provider
        })
        .chain('lean')
        .chain('exec')
        .resolves(affiliation)
    }

    // Utility function to mock mongoose models that are not
    // what we are verifying in the tests for this context
    function mockMongoose(input) {
      const company = {
        _id: input.companyId,
        parent_id: mongoose.Types.ObjectId(),
        statusV2: CompanyStatus.APPROVED
      }
      const affiliation = {
        company_id: input.companyId,
        provider: input.params.provider,
        enabled: true
      }

      mockCompanyHardwareAffiliation(input, company, null, affiliation)

      const connectorStub = sinon.stub(Connector, 'default')

      // registerOnProvider()
      connectorStub.withArgs(input.locale, input.params.provider).returns({
        async registerHardware() {
          return { success: true, status: 'active' }
        }
      })

      // registerOnSoftwareProvider()
      connectorStub
        .withArgs(input.locale, input.params.software_provider)
        .returns({
          async registerHardware() {
            return { success: true, status: 'active' }
          }
        })

      // FIXME: 2021-07-08 AffiliationService queries for the same company
      // multiple times
      companyMock
        .expects('findOne')
        .once()
        .withExactArgs({
          _id: input.companyId
        })
        .chain('lean')
        .chain('exec')
        .resolves(company)
      // FIXME: 2021-07-08 AffiliationService queries for the same affiliation
      // multiple times
      affiliationMock
        .expects('findOne')
        .once()
        .withExactArgs({
          company_id: input.companyId,
          enabled: true,
          provider: input.params.provider
        })
        .chain('lean')
        .chain('exec')
        .resolves(affiliation)

      // findAffiliationOnParent()
      affiliationMock
        .expects('findOne')
        .once()
        .withExactArgs({
          company_id: company.parent_id,
          enabled: true,
          provider: input.params.provider
        })
        .chain('lean')
        .chain('exec')
        .resolves(affiliation)

      // createHardware()
      // It's pretty much the input.params object
      // but it assigns the _id field before the creation
      // so here we fake this assignment
      const hardware = Object.assign({}, input.params, {
        status: 'pending_activation',
        _id: mongoose.Types.ObjectId()
      })
      sinon.stub(Hardware, 'create').callsFake(async () => {
        return Object.assign({}, hardware, { status: 'active' })
      })
      return {
        company,
        hardware
      }
    }

    it('sends `terminal_enabled` webhook before responding', async () => {
      const input = createHardwareInput()

      const { company, hardware } = mockMongoose(input)
      // Expectations
      const expected = {
        companyId: company.parent_id,
        eventName: 'terminal_enabled',
        modelName: 'capturehardware',
        modelId: hardware._id,
        oldStatus: hardware.status,
        currentStatus: 'active',
        payload: Object.assign(hardwareResponder(hardware), {
          status: 'active'
        })
      }

      const sendWebHookMock = sinon
        .mock(sendWebHook)
        .expects('default')
        .withExactArgs(
          expected.companyId,
          expected.eventName,
          expected.modelName,
          expected.modelId,
          expected.oldStatus,
          expected.currentStatus,
          expected.payload
        )

      await HardwareService.create(input.locale, input.params, input.companyId)

      sendWebHookMock.verify()
    })

    it('should fail with affiliation model not found error', () => {
      const input = createHardwareInput()
      const company = {
        _id: input.companyId,
        parent_id: mongoose.Types.ObjectId(),
        statusV2: CompanyStatus.APPROVED
      }

      mockCompanyHardwareAffiliation(input, company, null, null)

      return expect(
        HardwareService.create(input.locale, input.params, input.companyId)
      ).to.eventually.rejectedWith(ModelNotFoundError, 'Afiliação não existe.')
    })
    ;[
      [CompanyStatus.PENDING, 'Cadastro em análise de risco.'],
      [CompanyStatus.APPROVED, ''],
      [CompanyStatus.REJECTED, 'Cadastro recusado.'],
      [CompanyStatus.CANCELED, 'Cadastro cancelado.'],
      [CompanyStatus.BLOCKED, 'Cadastro bloqueado.'],
      [CompanyStatus.REVOKED, 'Cadastro revogado.'],
      [CompanyStatus.INACTIVE, 'Cadastro inativo.']
    ].forEach(([status, message]) => {
      it(`should fail with affiliation model disabled and company status ${status}`, () => {
        const input = createHardwareInput()
        const company = {
          _id: input.companyId,
          parent_id: mongoose.Types.ObjectId(),
          statusV2: status
        }
        const affiliation = {
          company_id: input.companyId,
          provider: input.params.provider,
          enabled: false
        }

        mockCompanyHardwareAffiliation(input, company, null, affiliation)

        return expect(
          HardwareService.create(input.locale, input.params, input.companyId)
        ).to.eventually.rejectedWith(
          AffiliationDisabledError,
          `Afiliação desabilitada. ${message}`
        )
      })
    })
  })

  context('disableChild', () => {
    function disableChildInput(overrides = {}) {
      return Object.assign(
        {
          locale: frameworkConfig.core.i18n.defaultLocale,
          hardwareId: mongoose.Types.ObjectId(),
          childId: mongoose.Types.ObjectId(),
          companyId: mongoose.Types.ObjectId()
        },
        overrides
      )
    }

    // Utility function to mock mongoose models that are not
    // what we are verifying in the tests for this context
    function mockMongoose(input, { hardware, affiliation }) {
      companyMock
        .expects('findOne')
        .withArgs({
          _id: input.childId,
          parent_id: input.companyId
        })
        .chain('lean')
        .chain('exec')
        .resolves({
          _id: input.childId,
          parent_id: input.companyId
        })

      hardwareMock
        .expects('findOne')
        .withArgs({ _id: input.hardwareId, company_id: input.childId })
        .resolves(hardware)

      affiliationMock
        .expects('findOne')
        .withArgs({
          company_id: input.companyId,
          enabled: true,
          provider: hardware.provider
        })
        .chain('lean')
        .chain('exec')
        .resolves(affiliation)
    }

    it('disables hardware on software provider if it exists', async () => {
      // We are not testing sendingWebhook for now
      sinon.stub(sendWebHook, 'default').resolves()

      const input = disableChildInput()
      let hardwareStub = {
        _id: input.hardwareId,
        status: 'active',
        software_provider: 'hash_capture',
        provider: 'hash',
        async save() {
          return this
        }
      }
      let affiliationStub = {
        security_key: 'this-is-a-legacy-and-deprecated-parameter'
      }
      mockMongoose(input, {
        hardware: hardwareStub,
        affiliation: affiliationStub
      })

      // Simplest provider that can disable software
      const provider = { disableHardware: function() {} }
      sinon.stub(Connector, 'default').returns(provider)
      let swProviderMock = sinon.mock(provider)

      // Expectations
      const expected = {
        hardware: hardwareStub,
        // 2021-07-06: This a legacy parameter
        // Current software providers: hash_capture and celer do not
        // require other parameters except for the hardware.
        affiliationSecurityKey: affiliationStub.security_key
      }

      swProviderMock
        .expects('disableHardware')
        .withArgs(expected.hardware, expected.affiliationSecurityKey)
        .resolves({ success: true })

      await HardwareService.disableChild(
        input.locale,
        input.hardwareId,
        input.childId,
        input.companyId
      )

      swProviderMock.verify()
    })

    it('sends `terminal_disabled` webhook before responding', async () => {
      const input = disableChildInput()

      let hardwareStub = {
        _id: input.hardwareId,
        status: 'active',
        software_provider: 'none',
        async save() {
          return this
        }
      }
      mockMongoose(input, { hardware: hardwareStub })

      // Expectations
      const expected = {
        companyId: input.companyId,
        eventName: 'terminal_disabled',
        modelName: 'capturehardware',
        modelId: input.hardwareId,
        oldStatus: hardwareStub.status,
        currentStatus: 'disabled',
        payload: Object.assign(hardwareResponder(hardwareStub), {
          status: 'disabled'
        })
      }

      const sendWebHookMock = sinon
        .mock(sendWebHook)
        .expects('default')
        .withExactArgs(
          expected.companyId,
          expected.eventName,
          expected.modelName,
          expected.modelId,
          expected.oldStatus,
          expected.currentStatus,
          expected.payload
        )

      await HardwareService.disableChild(
        input.locale,
        input.hardwareId,
        input.childId,
        input.companyId
      )

      sendWebHookMock.verify()
    })
  })
})
