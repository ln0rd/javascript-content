import { mapModel } from 'application/core/helpers/responder'

export function payablesSettlementResponder(model) {
  return mapModel(model, payable => ({
    object: 'payable',
    id: payable._id,
    transaction_id: payable.transaction_id || null,
    payment_date: payable.payment_date || null,
    original_payment_date: payable.original_payment_date || null,
    status: payable.status
  }))
}
