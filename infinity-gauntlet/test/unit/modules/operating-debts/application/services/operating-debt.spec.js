import sinon from 'sinon'
import 'sinon-mongoose'
import moment from 'moment'
import mongoose from 'mongoose'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import Settlement from 'application/core/models/settlement'
import { generateSettlement } from 'test/fixtures'
import OperatingDebt from 'application/core/models/operating-debt'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'

const { Types } = mongoose
const { ObjectId } = Types

chai.use(chaiAsPromised)
const { expect } = chai
const logStub = {
  info: () => {},
  warn: () => {},
  error: () => {}
}

describe('Unit => Operating Debt - Service', () => {
  context('#createSettlementOperatingDebt', () => {
    let operatingDebtStub
    let settlementStub
    beforeEach(() => {
      operatingDebtStub = sinon.stub(OperatingDebt, 'create')
      sinon
        .mock(OperatingDebt)
        .expects('findOne')
        .chain('exec')
        .resolves(null)
      settlementStub = sinon.stub(Settlement, 'updateMany')
    })
    afterEach(() => {
      sinon.restore()
    })
    it('should throw error before update settlement when debt creation fails', async () => {
      operatingDebtStub.rejects(new Error('Error stubbing repository'))
      await expect(
        new OperatingDebtService(logStub).createSettlementOperatingDebt(
          generateSettlement({})
        )
      ).to.eventually.be.rejectedWith('Error stubbing repository')
      expect(operatingDebtStub.called).to.be.true
      expect(settlementStub.called).to.be.false
    })
    it('should try register debts on settlements', async () => {
      const debtId = new mongoose.Types.ObjectId()
      operatingDebtStub.resolves({ _id: debtId })
      await new OperatingDebtService(logStub).createSettlementOperatingDebt(
        generateSettlement({})
      )
      expect(operatingDebtStub.called).to.be.true
      expect(settlementStub.called).to.be.true
    })
  })
  context('#processNegativeSettlement', async () => {
    let settlementMock
    let createSettlementOperatingDebtSpy
    beforeEach(() => {
      settlementMock = sinon
        .mock(Settlement)
        .expects('find')
        .chain('exec')
      createSettlementOperatingDebtSpy = sinon.stub(
        OperatingDebtService.prototype,
        'createSettlementOperatingDebt'
      )
    })
    afterEach(() => {
      sinon.restore()
    })
    it('should not create operating debt when not found negative settlements', async () => {
      settlementMock.resolves([])
      await new OperatingDebtService(logStub).processNegativeSettlements(
        '2022-01-31'
      )
      return expect(createSettlementOperatingDebtSpy.called).to.be.eq(false)
    })
    it('should create operating debt when found one or more negative settlements', async () => {
      settlementMock.resolves([generateSettlement({}), generateSettlement({})])
      await new OperatingDebtService(logStub).processNegativeSettlements(
        '2022-01-31'
      )
      return expect(createSettlementOperatingDebtSpy.called).to.be.eq(true)
    })
  })
  context('#payDebt', async () => {
    let updateOneOperatingDebtMock
    let updateOneSettlementMock
    let clock
    const fixMoment = moment('2019-08-01')
    beforeEach(() => {
      updateOneOperatingDebtMock = sinon.stub(OperatingDebt, 'updateOne')
      updateOneSettlementMock = sinon.stub(Settlement, 'updateOne')
      clock = sinon.useFakeTimers(fixMoment.toDate().getTime())
    })
    afterEach(() => {
      sinon.restore()
      clock.restore()
    })
    it('should pay the debt in full with the settlement amounts', async () => {
      const debtId = ObjectId()
      const debt = {
        _id: debtId,
        debt_amount: 10000,
        paid_amount: 0
      }
      const brands = {
        mastercard: {
          debit: 5000
        },
        elo: {
          credit: 2500,
          anticipated_credit: 2500
        }
      }
      const settlement = generateSettlement({
        amount: 10000,
        settled_amount: 0,
        brands
      })
      const operatingDebtService = new OperatingDebtService(logStub)
      await operatingDebtService.payDebt(debt, settlement)
      const [filterDebtUpdate, debtUpdate] = updateOneOperatingDebtMock.args[0]
      expect(filterDebtUpdate._id.toString()).to.be.eq(debtId.toString())
      expect(debtUpdate).to.be.deep.eq({
        $set: {
          status: 'paid',
          paid_amount: 10000,
          updated_at: debtUpdate.$set.updated_at
        },
        $addToSet: {
          payment_history: {
            used_amount: 10000,
            model: 'settlement',
            model_id: settlement._id,
            description: 'positive settlement',
            payment_date: moment().format('YYYY-MM-DD'),
            payments_by_brand: [
              {
                brand: 'mastercard',
                debit: 5000,
                credit: 0,
                installment_credit: 0,
                anticipated_credit: 0
              },
              {
                brand: 'elo',
                debit: 0,
                credit: 2500,
                installment_credit: 0,
                anticipated_credit: 2500
              }
            ]
          }
        }
      })
      const [
        filterSettlementUpdate,
        settlementUpdate
      ] = updateOneSettlementMock.args[0]
      expect(filterSettlementUpdate._id.toString()).to.be.eq(
        settlement._id.toString()
      )
      expect(settlementUpdate.$set.settled_amount).to.be.eq(10000)
      expect(settlementUpdate.$set.status).to.be.eq('settled')
      expect(settlementUpdate.$set.brands).to.have.lengthOf(2)
      settlementUpdate.$set.brands.forEach(brand => {
        expect(brand.debit).to.be.eq(0)
        expect(brand.credit).to.be.eq(0)
        expect(brand.installment_credit).to.be.eq(0)
        expect(brand.anticipated_credit).to.be.eq(0)
      })
      expect(settlementUpdate.$set.updated_at).to.be.exist
      expect(settlementUpdate.$addToSet.paid_operating_debts).to.be.exist
      const paidOperationDebts = settlementUpdate.$addToSet.paid_operating_debts
      expect(paidOperationDebts.debt_id).to.be.eq(debtId)
      expect(paidOperationDebts.paid_amount).to.be.eq(10000)
      paidOperationDebts.payments_by_brand.forEach(brand => {
        expect(brand.installment_credit).to.be.eq(0)
        if (brand.brand === 'mastercard') {
          expect(brand.debit).to.be.eq(5000)
          expect(brand.credit).to.be.eq(0)
          expect(brand.anticipated_credit).to.be.eq(0)
          return
        }
        expect(brand.brand).to.be.eq('elo')
        expect(brand.debit).to.be.eq(0)
        expect(brand.credit).to.be.eq(2500)
        expect(brand.anticipated_credit).to.be.eq(2500)
      })
    })
  })
  context('#makeDebtTransfer', async () => {
    let updateManyOperatingDebtMock
    let createOperatingDebtStub
    beforeEach(() => {
      updateManyOperatingDebtMock = sinon
        .mock(OperatingDebt)
        .expects('updateMany')
      createOperatingDebtStub = sinon.stub(OperatingDebt, 'create')
    })
    afterEach(() => {
      sinon.restore()
    })
    it('should transfer debt creating other debt to pay', async () => {
      const operatingDebtId = ObjectId()
      const companyId = ObjectId().toString()
      const destinationCompanyId = ObjectId().toString()

      sinon.stub(OperatingDebt, 'findOne').returns({
        exec: sinon
          .stub()
          .onFirstCall()
          .returns({
            _id: operatingDebtId,
            company_id: destinationCompanyId,
            status: 'pending',
            debt_amount: 3000,
            paid_amount: 0,
            model: 'settlement',
            model_id: '6270d5111fc55a2a59636758',
            type: 'settlement_debt',
            payment_history: []
          })
          .onSecondCall()
          .returns(undefined)
      })
      const newOperatingDebtId = ObjectId()
      const newOperatingDebt = {
        _id: newOperatingDebtId,
        company_id: companyId,
        status: 'pending',
        debt_amount: 3000,
        paid_amount: 0,
        model: 'operating_debts',
        model_id: operatingDebtId.toString(),
        type: 'debt_transfer',
        payment_history: []
      }
      createOperatingDebtStub.returns(newOperatingDebt)

      const operatingDebtService = new OperatingDebtService(logStub)
      await operatingDebtService.makeDebtTransfer(
        operatingDebtId.toString(),
        companyId
      )
      delete newOperatingDebt._id
      expect(createOperatingDebtStub.args[0][0]).to.deep.equal(newOperatingDebt)
      const query = updateManyOperatingDebtMock.args[0][0]
      const patch = updateManyOperatingDebtMock.args[0][1]
      expect(query).to.deep.eq({
        _id: { $in: [operatingDebtId] }
      })
      expect(patch).to.be.deep.eq({
        $set: {
          paid_amount: 3000,
          status: 'paid',
          updated_at: patch.$set.updated_at
        },
        $addToSet: {
          payment_history: {
            used_amount: 3000,
            model: 'operating_debts',
            model_id: newOperatingDebtId.toString(),
            description: 'debt transfer',
            payment_date: moment().format('YYYY-MM-DD'),
            payments_by_brand: []
          }
        }
      })
    })
  })
})
