import { mapModel } from 'application/core/helpers/responder'

export function settlementResponder(model) {
  return mapModel(model, settlement => {
    return {
      object: 'settlement',
      id: settlement._id,
      provider: settlement.provider || 'stone',
      affiliations: settlement.affiliations || [],
      settlement_type: settlement.settlement_type || null,
      status: settlement.status || null,
      date: settlement.date || null,
      amount: settlement.amount || 0,
      settled_amount: settlement.settled_amount || 0,
      last_negative_amount: settlement.last_negative_amount || null,
      brands: settlement.brands || [],
      boleto: settlement.boleto || { payables: [], amount: 0 },
      charges: settlement.charges || [],
      received_charges: settlement.received_charges || [],
      created_at: settlement.created_at || null,
      updated_at: settlement.updated_at || null,
      company_full_name: settlement.company_full_name || null,
      company_document_number: settlement.company_document_number || null,
      company_document_type: settlement.company_document_type || null,
      company_name: settlement.company_name || null,
      company_id: settlement.company_id || null,
      cip_escrowed_amount: settlement.cip_escrowed_amount || 0
    }
  })
}
