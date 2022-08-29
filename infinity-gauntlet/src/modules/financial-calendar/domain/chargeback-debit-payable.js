import moment from 'moment'
import {
  calculateRefundCost,
  calculateRefundFee
} from 'application/core/domain/refund-payable'

function fromCreditPayable(creditPayable) {
  const negative = value => value * -1
  const basePayable = creditPayable.toJSON()

  const patch = {
    amount: negative(creditPayable.amount),
    cost: negative(calculateRefundCost(creditPayable)),
    fee: negative(calculateRefundFee(creditPayable)),
    mdr_cost: negative(creditPayable.mdr_cost),

    anticipation_cost: 0,
    anticipation_amount: 0,
    anticipation_fee: 0,
    cip_escrowed_amount: 0,

    status: 'waiting_funds',
    payment_date: moment().format('YYYY-MM-DD'),
    type: 'chargeback_debit',
    processed: true,
    anticipatable: false
  }
  ;['__v', '_id', 'created_at', 'updated_at'].forEach(
    key => delete basePayable[key.toString()]
  )

  const newPayableData = Object.assign(basePayable, patch)

  return newPayableData
}

export { fromCreditPayable }
