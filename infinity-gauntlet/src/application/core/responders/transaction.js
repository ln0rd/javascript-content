import { mapModel } from 'application/core/helpers/responder'

export function transactionResponder(model) {
  return mapModel(model, trx => {
    const cardResponse = {}

    if (trx.card) {
      cardResponse.first_digits = trx.card.first_digits
      cardResponse.last_digits = trx.card.last_digits
      cardResponse.brand = trx.card.brand
      cardResponse.country = trx.card.country
      cardResponse.holder_name = trx.card.holder_name
      cardResponse.valid = trx.card.valid
      cardResponse.expiration_date = trx.card.expiration_date
    }

    return {
      object: 'transaction',
      id: trx._id,
      charge_id: trx.charge_id || null,
      card: cardResponse,
      amount: trx.amount,
      status: trx.status || null,
      provider: trx.provider,
      total_fee: trx.total_fee || null,
      provider_transaction_id: trx.provider_transaction_id || null,
      paid_amount: trx.paid_amount || null,
      refunded_amount: trx.refunded_amount || null,
      acquirer_response_code: trx.acquirer_response_code || null,
      acquirer_name: trx.acquirer_name || null,
      boleto_barcode: trx.boleto_barcode || null,
      boleto_url: trx.boleto_url || null,
      boleto_expiration_date: trx.boleto_expiration_date || null,
      capture_method: trx.capture_method || null,
      installments: trx.installments || null,
      payment_method: trx.payment_method || null,
      postback_url: trx.postback_url || null,
      soft_descriptor: trx.soft_descriptor || null,
      order_id: trx.order_id || null,
      company_name: trx.company_name || null,
      company_full_name: trx.company_full_name || null,
      company_metadata: trx.company_metadata || {},
      company_parent_id: trx.company_parent_id || null,
      company_document_number: trx.company_document_number || null,
      company_created_at: trx.company_created_at || null,
      company_document_type: trx.company_document_type || null,
      is_split_rule_processed: trx.is_split_rule_processed,
      nsu: trx.nsu || null,
      tid: trx.tid || null,
      serial_number: trx.serial_number || null,
      metadata: trx.metadata ? JSON.parse(trx.metadata) : null,
      status_reason: trx.status_reason || null,
      split_origin: trx.split_origin || null,
      split_rules: trx.split_rules || null,
      captured_at: trx.captured_at || null,
      refunded_at: trx.refunded_at || null,
      acquirer_created_at: trx.acquirer_created_at || null,
      created_at: trx.created_at || null,
      updated_at: trx.updated_at || null,
      company_id: trx.company_id,
      captured_by: trx.captured_by || null
    }
  })
}
