import { mapModel } from 'application/core/helpers/responder'

export function payinResponder(model) {
  return mapModel(model, payin => {
    return {
      object: 'payin',
      id: payin._id,
      status: payin.status,
      provider: payin.provider,
      amount: payin.amount,
      description: payin.description || '',
      fee: payin.fee,
      source_type: payin.source_type,
      destination: payin.destination,
      metadata: payin.metadata || {},
      method: payin.method,
      date: payin.date,
      reason: payin.reason || null,
      created_at: payin.created_at || null,
      updated_at: payin.updated_at || null,
      company_name: payin.company_name || null,
      company_full_name: payin.company_full_name || null,
      company_metadata: payin.company_metadata || {},
      company_parent_id: payin.company_parent_id || null,
      company_document_number: payin.company_document_number || null,
      company_created_at: payin.company_created_at || null,
      company_document_type: payin.company_document_type || null,
      company_id: payin.company_id,
      operation_id: payin.operation_id || '',
      scheduled_to: payin.scheduled_to || ''
    }
  })
}
