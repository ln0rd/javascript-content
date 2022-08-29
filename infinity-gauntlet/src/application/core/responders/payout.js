import { mapModel } from 'application/core/helpers/responder'

export function payoutResponder(model) {
  return mapModel(model, payout => {
    return {
      object: 'payout',
      id: payout._id,
      status: payout.status,
      status_message: payout.status_message,
      provider: payout.provider,
      amount: payout.amount,
      description: payout.description || '',
      automatic: payout.automatic,
      fee: payout.fee,
      source_type: payout.source_type,
      destination: payout.destination,
      metadata: payout.metadata || {},
      method: payout.method,
      date: payout.date,
      reason: payout.reason || null,
      created_at: payout.created_at || null,
      updated_at: payout.updated_at || null,
      company_name: payout._company_partial.name || null,
      company_full_name: payout._company_partial.full_name || null,
      company_metadata: payout._company_partial.company_metadata || {},
      company_parent_id: payout.iso_id || null,
      company_document_number: payout._company_partial.document_number || null,
      company_created_at: payout._company_partial.created_at || null,
      company_document_type: payout._company_partial.document_type || null,
      company_id: payout.company_id,
      operation_id: payout.operation_id || '',
      scheduled_to: payout.scheduled_to || ''
    }
  })
}
