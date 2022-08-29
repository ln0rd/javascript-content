import { mapModel } from 'application/core/helpers/responder'

export function chargeResponder(model) {
  return mapModel(model, charge => {
    const companyPartial = charge._company_partial || {}

    return {
      object: 'charge',
      id: charge._id,
      status: charge.status,
      amount: charge.amount,
      provider: charge.provider,
      description: charge.description || null,
      charge_method: charge.charge_method,
      charge_configuration_id: charge.charge_configuration_id || null,
      charge_date: charge.charge_date,
      original_charge_date: charge.original_charge_date || null,
      created_at: charge.created_at || null,
      updated_at: charge.updated_at || null,
      company_name: companyPartial.name || null,
      company_full_name: companyPartial.full_name || null,
      company_metadata: companyPartial.company_metadata || {},
      company_parent_id: charge.iso_id || null,
      company_document_number: companyPartial.document_number || null,
      company_created_at: companyPartial.created_at || null,
      company_document_type: companyPartial.document_type || null,
      company_id: charge.company_id,
      destination_company_id: charge.destination_company_id,
      payment_history: charge.payment_history || [],
      paid_amount: charge.paid_amount
    }
  })
}
