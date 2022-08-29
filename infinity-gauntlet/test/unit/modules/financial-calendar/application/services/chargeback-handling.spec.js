import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import mongoose from 'mongoose'

import { generateCompany, generatePayable } from 'test/fixtures/index'
import PayableRepository from 'modules/financial-calendar/infrastructure/repositories/payables'
import CompanyRepository from 'modules/financial-calendar/infrastructure/repositories/company'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'
import AffiliationRepository from 'modules/financial-calendar/infrastructure/repositories/affiliation'
import * as ChargebackResponsibilityProportionalToSplit from 'modules/financial-calendar/domain/chargeback-handling/policies/responsibility-proportional-to-splits'
import * as AssignedToOriginCompany from 'modules/financial-calendar/domain/chargeback-handling/policies/assigned-to-origin-company'
import ChargebackHandlingService from 'modules/financial-calendar/application/services/chargeback-handling'
import * as sendWebHook from 'application/webhook/helpers/deliverer'

import {
  PROPORTIONAL_TO_SPLIT,
  ASSIGNED_TO_ORIGIN_COMPANY
} from 'modules/financial-calendar/domain/chargeback-handling'
import generateSplitRules from 'test/fixtures/generateSplitRules'

chai.use(chaiAsPromised)
const { expect } = chai
const { ObjectId } = mongoose.Types

describe('Unit => Financial Calendar - Service - Chargeback Handling', () => {
  context('#handleNewChargeback', () => {
    const [COMPANY_A, COMPANY_B, ISO] = [ObjectId(), ObjectId(), ObjectId()]
    const transaction = {
      _id: 1,
      company_id: COMPANY_A,
      provider: 'hash',
      split_rules: generateSplitRules(1000, [
        { company_id: COMPANY_A, amount: 850 },
        { company_id: COMPANY_B, amount: 300 },
        { company_id: ISO, amount: 50 }
      ])
    }
    const dataTable = [
      {
        transaction_id: transaction._id,
        company_id: ISO,
        amount: 1059,
        mdr_cost: 1210,
        cost: 1210,
        mdr_fee: 0,
        anticipation_fee: 0,
        fee: 0,
        installment: 1,
        origin_company_id: COMPANY_A
      },
      {
        transaction_id: transaction._id,
        company_id: ISO,
        amount: 1059,
        mdr_cost: 1210,
        cost: 1210,
        mdr_fee: 0,
        anticipation_fee: 0,
        fee: 0,
        installment: 2,
        origin_company_id: COMPANY_A
      },
      {
        transaction_id: transaction._id,
        company_id: COMPANY_A,
        amount: 55000,
        mdr_cost: 0,
        cost: 0,
        mdr_fee: 2153,
        anticipation_fee: 0,
        fee: 2153,
        installment: 1,
        origin_company_id: COMPANY_A
      },
      {
        transaction_id: transaction._id,
        company_id: COMPANY_A,
        amount: 55000,
        mdr_cost: 0,
        cost: 0,
        mdr_fee: 1059,
        anticipation_fee: 0,
        fee: 1059,
        installment: 2,
        origin_company_id: COMPANY_A
      },
      {
        transaction_id: transaction._id,
        company_id: COMPANY_B,
        amount: 16500,
        mdr_cost: 1050,
        cost: 1050,
        mdr_fee: 0,
        anticipation_fee: 0,
        fee: 0,
        installment: 1,
        origin_company_id: COMPANY_A
      },
      {
        transaction_id: transaction._id,
        company_id: COMPANY_B,
        amount: 16500,
        mdr_cost: 1050,
        cost: 1050,
        mdr_fee: 0,
        anticipation_fee: 0,
        fee: 0,
        installment: 2,
        origin_company_id: COMPANY_A
      }
    ]

    const payables = dataTable.map(data => generatePayable(data))

    let proportionalMock
    let originMock
    let getChangebackHandlingPolicyMock
    beforeEach(() => {
      proportionalMock = sinon.mock(ChargebackResponsibilityProportionalToSplit)
      originMock = sinon.mock(AssignedToOriginCompany)

      getChangebackHandlingPolicyMock = sinon
        .mock(AffiliationRepository.prototype)
        .expects('findByCompanyIdAndProvider')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should call the proportional policy by default and not the others', async () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ])

      sinon
        .stub(PayableRepository.prototype, 'create')
        .resolves([{ _id: 123 }, { _id: 321 }])
      sinon.stub(PayableRepository.prototype, 'updateByIds').resolves()
      sinon
        .stub(TransactionRepository.prototype, 'findOne')
        .resolves({ _id: 1, iso_id: ISO })
      getChangebackHandlingPolicyMock.resolves({})

      proportionalMock.expects('apply').once()
      originMock.expects('apply').never()
      const transactionRepoMock = sinon.mock(TransactionRepository.prototype)
      transactionRepoMock.expects('updateByIds').once()
      const sendWebHookMock = sinon.mock(sendWebHook)
      sendWebHookMock.expects('default').twice()

      await new ChargebackHandlingService().handleNewChargeback({
        payables,
        transaction
      })

      proportionalMock.verify()
      originMock.verify()
      transactionRepoMock.verify()
    })

    it('should call the assigned to origin company policy by default and not the others', async () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ])
      sinon
        .stub(PayableRepository.prototype, 'create')
        .resolves([{ _id: 123 }, { _id: 321 }])
      sinon.stub(PayableRepository.prototype, 'updateByIds').resolves()
      sinon
        .stub(TransactionRepository.prototype, 'findOne')
        .resolves({ _id: 1, iso_id: ISO })

      getChangebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: ASSIGNED_TO_ORIGIN_COMPANY
      })

      proportionalMock.expects('apply').never()
      originMock.expects('apply').once()
      const transactionRepoMock = sinon.mock(TransactionRepository.prototype)
      transactionRepoMock.expects('updateByIds').once()
      const sendWebHookMock = sinon.mock(sendWebHook)
      sendWebHookMock.expects('default').twice()

      await new ChargebackHandlingService().handleNewChargeback({
        payables,
        transaction
      })

      proportionalMock.verify()
      originMock.verify()
      transactionRepoMock.verify()
    })

    it('should throw an error when creating the payables is not possible', () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ])

      const rejection = new Error('Failed Creating')
      sinon.stub(PayableRepository.prototype, 'create').rejects(rejection)
      sinon
        .stub(TransactionRepository.prototype, 'findOne')
        .resolves({ _id: 1, iso_id: ISO })

      getChangebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: PROPORTIONAL_TO_SPLIT
      })

      return expect(
        new ChargebackHandlingService().handleNewChargeback({
          payables,
          transaction
        })
      ).to.eventually.rejectedWith(rejection)
    })

    it('should throw an error when updating the payables is not possible', () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ])

      sinon
        .stub(PayableRepository.prototype, 'create')
        .resolves([{ _id: 123 }, { _id: 321 }])

      const rejection = new Error('Failed Updating')
      sinon.stub(PayableRepository.prototype, 'updateByIds').rejects(rejection)

      getChangebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: PROPORTIONAL_TO_SPLIT
      })

      return expect(
        new ChargebackHandlingService().handleNewChargeback({
          payables,
          transaction
        })
      ).to.eventually.rejectedWith(rejection)
    })

    it('should try to update the transaction status', async () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO },
          { _id: ISO }
        ])

      sinon
        .stub(PayableRepository.prototype, 'create')
        .resolves([{ _id: 123 }, { _id: 321 }])
      sinon
        .stub(TransactionRepository.prototype, 'findOne')
        .resolves({ _id: 1, iso_id: ISO })

      sinon.stub(PayableRepository.prototype, 'updateByIds').resolves()

      getChangebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: PROPORTIONAL_TO_SPLIT
      })

      const transactionRepoMock = sinon.mock(TransactionRepository.prototype)
      transactionRepoMock.expects('updateByIds').once()
      const sendWebHookMock = sinon.mock(sendWebHook)
      sendWebHookMock.expects('default').twice()

      await new ChargebackHandlingService().handleNewChargeback({
        payables,
        transaction
      })

      transactionRepoMock.verify()
    })

    it('should apply chargeback even if does not exist iso in split_rules', async () => {
      sinon
        .stub(CompanyRepository.prototype, 'findByIds')
        .resolves([
          { _id: COMPANY_A, parent_id: ISO },
          { _id: COMPANY_B, parent_id: ISO }
        ])

      sinon
        .stub(PayableRepository.prototype, 'create')
        .resolves([{ _id: 123 }, { _id: 321 }])

      sinon.stub(PayableRepository.prototype, 'updateByIds').resolves()

      sinon.stub(CompanyRepository.prototype, 'findOne').resolves({ _id: ISO })
      sinon
        .stub(TransactionRepository.prototype, 'findOne')
        .resolves({ _id: 1, iso_id: ISO })

      getChangebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: PROPORTIONAL_TO_SPLIT
      })

      const transactionRepoMock = sinon.mock(TransactionRepository.prototype)
      transactionRepoMock.expects('updateByIds').once()
      const sendWebHookMock = sinon.mock(sendWebHook)
      sendWebHookMock.expects('default').twice()

      await new ChargebackHandlingService().handleNewChargeback({
        payables,
        transaction
      })

      transactionRepoMock.verify()
    })
  })

  context('#setChargebackHandlingPolicyFromParent', () => {
    let getChargebackHandlingPolicyMock

    beforeEach(() => {
      getChargebackHandlingPolicyMock = sinon
        .mock(AffiliationRepository.prototype)
        .expects('findByCompanyIdAndProvider')
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should return ASSIGNED_TO_ORIGIN_COMPANY if was defined this in affiliation', async () => {
      getChargebackHandlingPolicyMock.resolves({
        chargeback_handling_policy: ASSIGNED_TO_ORIGIN_COMPANY
      })
      const company = generateCompany()
      const provider = 'hash'
      const affiliationPolicy = await new ChargebackHandlingService().getChargebackHandlingPolicyFromParentCompany(
        company,
        provider
      )

      expect(affiliationPolicy).to.be.eq(ASSIGNED_TO_ORIGIN_COMPANY)
    })

    it('should return PROPORTIONAL_TO_SPLIT if doest have parent_id in company', async () => {
      getChargebackHandlingPolicyMock.resolves({})
      const company = generateCompany()
      delete company.parent_id

      const provider = 'hash'
      const affiliationPolicy = await new ChargebackHandlingService().getChargebackHandlingPolicyFromParentCompany(
        company,
        provider
      )

      expect(affiliationPolicy).to.be.eq(PROPORTIONAL_TO_SPLIT)
    })

    it('should return PROPORTIONAL_TO_SPLIT if doest have chargeback_handling_policy defined in affiliation', async () => {
      getChargebackHandlingPolicyMock.resolves({})
      const company = generateCompany()
      const provider = 'hash'
      const affiliationPolicy = await new ChargebackHandlingService().getChargebackHandlingPolicyFromParentCompany(
        company,
        provider
      )

      expect(affiliationPolicy).to.be.eq(PROPORTIONAL_TO_SPLIT)
    })

    it('should return PROPORTIONAL_TO_SPLIT if doest exists afiliation defined for this company', async () => {
      getChargebackHandlingPolicyMock.resolves(undefined)
      const company = generateCompany()
      const provider = 'hash'
      const affiliationPolicy = await new ChargebackHandlingService().getChargebackHandlingPolicyFromParentCompany(
        company,
        provider
      )

      expect(affiliationPolicy).to.be.eq(PROPORTIONAL_TO_SPLIT)
    })
  })
})
