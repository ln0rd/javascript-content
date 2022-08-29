import { mapModel } from 'application/core/helpers/responder'

export function disputeResponder(model) {
  return mapModel(model, trx => {
    return {
      object: 'dispute',
      id: trx._id,
      created_at: trx.created_at || null,
      updated_at: trx.updated_at || null,
      transaction_id: trx.transaction_id
    }
  })
}
