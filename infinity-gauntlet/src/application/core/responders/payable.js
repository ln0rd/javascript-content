import moment from 'moment'
import { mapModel } from 'application/core/helpers/responder'

export function payableResponder(model) {
  return mapModel(model, payable => {
    let transactionCapturedAt = null

    if (payable.transaction_captured_at) {
      transactionCapturedAt = moment(
        new Date(payable.transaction_captured_at)
      ).format('YYYY-MM-DD')
    }

    return {
      object: 'payable',
      id: payable._id,
      provider: payable.provider,
      provider_id: payable.provider_id || null,
      settlement_id: payable.settlement_id || null,
      mcc: payable.mcc || null,
      affiliation_id: payable.affiliation_id || null,
      origin_affiliation_id: payable.origin_affiliation_id || null,
      transaction_id: payable.transaction_id || null,
      provider_transaction_id: payable.provider_transaction_id || null,
      amount: payable.amount || null,
      mdr_amount: payable.mdr_amount || 0,
      anticipation_amount: payable.anticipation_amount || 0,
      transaction_amount: payable.transaction_amount || null,
      fee: payable.fee,
      anticipation_fee: payable.anticipation_fee,
      mdr_fee: payable.mdr_fee,
      cost: payable.cost,
      cip_escrowed_amount: payable.cip_escrowed_amount,
      anticipation_cost: payable.anticipation_cost,
      mdr_cost: payable.mdr_cost,
      total_installments: payable.total_installments || null,
      installment: payable.installment || null,
      payment_method: payable.payment_method || null,
      transaction_nsu: payable.transaction_nsu || null,
      payment_date: payable.payment_date || null,
      original_payment_date: payable.original_payment_date || null,
      transaction_captured_at: transactionCapturedAt,
      card_brand: payable.card_brand || null,
      type: payable.type || null,
      origin_company_id: payable.origin_company_id || null,
      owner_company_id: payable.owner_company_id || null,
      status: payable.status,
      created_at: payable.created_at || null,
      updated_at: payable.updated_at || null,
      company_id: payable.company_id
    }
  })
}
