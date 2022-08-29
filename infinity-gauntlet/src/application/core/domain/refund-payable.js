import moment from 'moment'
import R from 'ramda'
import Payable from 'application/core/models/payable'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'DOMAIN_REFUND_PAYABLE' })

// 2019-10-23 FIXME: moment() may not be the timestamp the refund was requested
// 2019-10-23 Warning: Should we be careful about timezone issues? Is the timezone assumed Brasilia time?
// 2019-11-06 the warning above is right, there is a problem related to it a business rule must be defined for it
const isSameDay = payable =>
  moment().isBefore(moment(payable.transaction_captured_at).endOf('day'))

/*
  This is a business rule: https://github.com/hashlab/product-development/issues/277
  If the refund was requested in the same day the transaction was captured
  then we will refund the anticipation costs
  else we will NOT refund the anticipation costs
*/
export const calculateRefundFee = payable => {
  const fee = isSameDay(payable)
    ? payable.fee
    : payable.fee - payable.anticipation_fee
  if (fee < 0) {
    Logger.warn(
      { payable_id: payable._id, fee },
      'anticipation-fee-greater-than-fee'
    )
  }
  return fee
}

export const calculateRefundCost = payable => {
  const cost = isSameDay(payable)
    ? payable.cost
    : payable.cost - payable.anticipation_cost
  if (cost < 0) {
    Logger.warn(
      { payable_id: payable._id, cost },
      'anticipation-cost-greater-than-cost'
    )
  }
  return cost
}
export function createRefundPayable(originalPayable) {
  const negative = value => value * -1

  const patch = {
    amount: negative(originalPayable.amount),
    cost: negative(calculateRefundCost(originalPayable)),
    fee: negative(calculateRefundFee(originalPayable)),
    mdr_cost: negative(originalPayable.mdr_cost),
    mdr_fee: negative(originalPayable.mdr_fee),
    mdr_amount: negative(originalPayable.mdr_amount),

    anticipation_cost: isSameDay(originalPayable)
      ? negative(originalPayable.anticipation_cost)
      : 0,
    anticipation_amount: isSameDay(originalPayable)
      ? negative(originalPayable.anticipation_amount)
      : 0,
    anticipation_fee: isSameDay(originalPayable)
      ? negative(originalPayable.anticipation_fee)
      : 0,

    status: 'waiting_funds',
    payment_date: moment().format('YYYY-MM-DD'),
    type: 'refund',
    processed: true,
    anticipatable: false
  }
  const refundPayableBase = R.omit(
    ['__v', '_id', 'settlement_id', 'created_at', 'updated_at'],
    originalPayable.toJSON()
  )
  const refundPayable = R.merge(refundPayableBase, patch)
  Logger.info(
    { originalPayable: originalPayable.toJSON(), refundPayable },
    'refund-cost-fee'
  )

  return new Payable(refundPayable)
}
