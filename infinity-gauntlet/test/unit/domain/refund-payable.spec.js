import { expect } from 'chai'
import moment from 'moment'
import sinon from 'sinon'
import R from 'ramda'
import { createRefundPayable } from 'application/core/domain/refund-payable'
import Payable from 'application/core/models/payable'

const fixMoment = moment('2019-08-01')
const fixDate = fixMoment.format('YYYY-MM-DD')

const createPayable = ({
  transaction_captured_at = '2019-11-06',
  amount = 107,
  cost = 89,
  fee = 0,
  mdr_cost = 89,
  anticipation_fee = 0,
  anticipation_cost = 0
}) =>
  new Payable({
    amount,
    mdr_cost,
    cost,
    anticipation_fee,
    fee,
    _id: 6222442,
    updated_at: new Date('2019-11-07T10:30:07.064Z'),
    created_at: new Date('2019-11-06T03:29:23.171Z'),
    provider: 'hash',
    affiliation_id: '5c11001472cd3d0007e68cc8',
    mcc: '5499',
    origin_affiliation_id: '5d2762fbf67b72000b1c1e31',
    transaction_id: 3045292,
    transaction_nsu: '291071',
    transaction_amount: 7210,
    status: 'paid',
    capture_method: 'emv',
    provider_transaction_id: '41094832461305',
    split_rule_id: '5dc23e13d69e0d0007d93d84',
    total_installments: 1,
    installment: 1,
    payment_method: 'debit_card',
    transaction_captured_at,
    card_brand: 'mastercard',
    type: 'credit',
    origin_company_id: '5bd9cece05e0ce0007f9161a',
    owner_company_id: '59dcd1f57033b90004b32339',
    company_id: '59dcd1f57033b90004b32339',
    payment_date: '2019-11-07',
    processed: false,
    conciliated_anticipation_cost: 0,
    conciliated_mdr_cost: 0,
    conciliated_cost: 0,
    anticipation_cost,
    mdr_fee: 0,
    anticipation_amount: 0,
    mdr_amount: 107,
    conciliated_amount: 0,
    transaction_canceled: false,
    anticipatable: true,
    anticipated: false,
    __v: 0,
    settlement_id: '5dc3f22e36e0ba0007710240'
  })
describe('Unit => Domain: Refund Payables', () => {
  context('createRefundPayable', () => {
    {
      // this block is responsible to test things that are valid for every refund by default
      const payable = createPayable({})
      const refund = createRefundPayable(payable)

      it('status should be waiting_funds', () =>
        expect(refund.status).to.equal('waiting_funds'))
      it('type should be refund', () => expect(refund.type).to.equal('refund'))
      it('anticipation should be zero', () => {
        expect(refund.anticipation_cost).to.equal(0)
        expect(refund.anticipation_amount).to.equal(0)
        expect(refund.anticipation_fee).to.equal(0)
      })
      it('amount, cost, fee, mdr_cost, mdr_amount, mdr_fee should be the opposite of the original payable', () => {
        expect(refund.amount).to.equal(payable.amount * -1)
        expect(refund.cost).to.equal(payable.cost * -1)
        expect(refund.fee).to.equal(payable.fee * -1)
        expect(refund.mdr_cost).to.equal(payable.mdr_cost * -1)
        expect(refund.mdr_amount).to.equal(payable.mdr_amount * -1)
        expect(refund.mdr_fee).to.equal(payable.mdr_fee * -1)
      })

      it('should use the fields from the original payable', () => {
        const omitDynamicFields = R.omit([
          '__v',
          '_id',
          'created_at',
          'updated_at',
          'amount',
          'cost',
          'fee',
          'mdr_cost',
          'mdr_fee',
          'mdr_amount',
          'anticipation_cost',
          'anticipation_amount',
          'anticipation_fee',
          'status',
          'payment_date',
          'type',
          'processed',
          'anticipatable',
          'settlement_id'
        ])

        expect(omitDynamicFields(payable.toJSON())).to.eql(
          omitDynamicFields(refund.toJSON())
        )
      })
      it('payment_date should be today', () => {
        sinon.useFakeTimers(fixMoment.toDate().getTime())

        const payable = createPayable({})
        const refund = createRefundPayable(payable)

        expect(refund.payment_date).to.equal(fixDate)
      })
    }
    it('anticipation_fee and anticipation_cost should be refunded only on the same day', () => {
      sinon.useFakeTimers(fixMoment.toDate().getTime())
      {
        const payable = createPayable({
          transaction_captured_at: fixDate,
          fee: 25,
          cost: 37,
          anticipation_cost: 7,
          anticipation_fee: 10
        })
        const refund = createRefundPayable(payable)
        expect(refund.fee).to.equal(-25)
        expect(refund.cost).to.equal(-37)
      }

      {
        const payable = createPayable({
          // any date before fixDate
          transaction_captured_at: '2019-07-01',
          fee: 25,
          cost: 37,
          anticipation_cost: 7,
          anticipation_fee: 10
        })
        const refund = createRefundPayable(payable)
        expect(refund.fee).to.equal(-15)
        expect(refund.cost).to.equal(-30)
      }
    })

    it('should anticipation_fee and anticipation_cost should return 0 if refunded is not in same day ', () => {
      sinon.useFakeTimers(fixMoment.toDate().getTime())
      const payable = createPayable({
        transaction_captured_at: moment().format('YYYY-MM-DD'),
        anticipation_cost: 30,
        anticipation_fee: 20
      })
      const threeDaysAfterPayableCreatedAt = fixMoment.add(3, 'day')
      sinon.useFakeTimers(threeDaysAfterPayableCreatedAt.toDate().getTime())
      const refund = createRefundPayable(payable)

      expect(refund.payment_date).to.equal(
        threeDaysAfterPayableCreatedAt.format('YYYY-MM-DD')
      )
      expect(refund.anticipation_cost).to.equal(0)
      expect(refund.anticipation_fee).to.equal(0)
    })

    it('should anticipation_fee and anticipation_cost should return their values if refunded is in same day ', () => {
      sinon.useFakeTimers(fixMoment.toDate().getTime())
      const payable = createPayable({
        transaction_captured_at: moment().format('YYYY-MM-DD'),
        anticipation_cost: 30,
        anticipation_fee: 20
      })
      const refund = createRefundPayable(payable)

      expect(refund.anticipation_cost).to.equal(-30)
      expect(refund.anticipation_fee).to.equal(-20)
    })
  })
})
