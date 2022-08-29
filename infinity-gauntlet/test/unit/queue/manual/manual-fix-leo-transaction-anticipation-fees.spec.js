import sinon from 'sinon'
import 'sinon-mongoose'
import Payable from 'application/core/models/payable'
import { generatePayable } from '../../../fixtures'
import {
  calculateAnticipationFee,
  updateMarceneiroPayable,
  updateRelatedLeoPayable
} from 'application/queue/tasks/manual/manual-fix-leo-transaction-anticipation-fees'
import { expect } from 'chai'

describe('Unit => Queue => Manual Task: TriggerEvent', () => {
  let payableFindOneMock

  beforeEach(() => {
    payableFindOneMock = sinon
      .mock(Payable)
      .expects('findOne')
      .chain('exec')
  })

  afterEach(() => {
    sinon.restore()
  })

  context('calculateAnticipationFee', () => {
    it('should return 0 if original_payment_date is equal to payment_date', () => {
      const payable = generatePayable({
        amount: 10,
        fee: 1,
        cost: 2,
        payment_date: '2021-02-09',
        original_payment_date: '2021-02-09'
      })
      const anticipationFee = 25
      expect(calculateAnticipationFee(payable, anticipationFee)).to.eql(0)
    })

    it('should calculate anticipation fee of 30 days for 9,70 net amount', () => {
      const payable = generatePayable({
        amount: 1000,
        fee: 10,
        cost: 20,
        payment_date: '2021-01-01',
        original_payment_date: '2021-01-31'
      })
      const anticipationFee = 2
      expect(calculateAnticipationFee(payable, anticipationFee)).to.eql(20)
    })
  })

  context('updateMarceneiroPayable', () => {
    it('should update payable anticipation_fee', () => {
      const payable = generatePayable({
        amount: 1000,
        fee: 10,
        cost: 20,
        payment_date: '2021-01-01',
        original_payment_date: '2021-01-31'
      })
      const feeRule = {
        anticipation_fee: 2.0
      }
      payable.save = () => {}
      const payableSaveStub = sinon.stub(payable, 'save').resolves()
      updateMarceneiroPayable(payable, feeRule)

      sinon.assert.calledOnce(payableSaveStub)

      expect(payable.fee).to.be.eq(30)
      expect(payable.cost).to.be.eq(20)
      expect(payable.anticipation_fee).to.be.eq(20)
    })
  })

  context('updateRelatedLeoPayable', () => {
    it('should update ISO payable anticipation_cost', async () => {
      const originCompanyPayable = generatePayable({
        amount: 1000,
        fee: 10,
        cost: 20,
        payment_date: '2021-01-01',
        original_payment_date: '2021-01-31'
      })
      const isoId = 'iso_id'
      const isoPayable = generatePayable({
        amount: 1000,
        fee: 0,
        cost: 20,
        payment_date: '2021-01-01',
        original_payment_date: '2021-01-31',
        company: isoId,
        anticipation_cost: 10
      })
      isoPayable.save = () => {}

      payableFindOneMock.resolves(isoPayable)
      const affiliation = {
        costs: {
          anticipation_cost: 1.99
        }
      }
      const payableSaveStub = sinon.stub(isoPayable, 'save').resolves()
      await updateRelatedLeoPayable(originCompanyPayable, affiliation)

      sinon.assert.calledOnce(payableSaveStub)

      expect(originCompanyPayable.fee).to.be.eq(10)
      expect(originCompanyPayable.cost).to.be.eq(20)
      expect(originCompanyPayable.anticipation_fee).to.be.eq(0)

      expect(isoPayable.fee).to.be.eq(0)
      expect(isoPayable.cost).to.be.eq(30)
      expect(isoPayable.anticipation_cost).to.be.eq(20)
    })
  })
})
