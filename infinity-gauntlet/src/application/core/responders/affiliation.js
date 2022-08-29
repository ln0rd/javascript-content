import { mapModel } from 'application/core/helpers/responder'

export function affiliationResponder(model) {
  return mapModel(model, affiliation => {
    return {
      object: 'affiliation',
      id: affiliation._id,
      provider: affiliation.provider,
      wallet_id: affiliation.wallet_id,
      provider_id: affiliation.provider_id || null,
      enabled: affiliation.enabled,
      key: affiliation.key || null,
      sales_key: affiliation.sales_key,
      status: affiliation.status,
      company_name: affiliation.company_name || null,
      merchant_id: affiliation.merchant_id,
      internal_merchant_id: affiliation.internal_merchant_id,
      internal_provider: affiliation.internal_provider,
      company_full_name: affiliation.company_full_name || null,
      company_metadata: affiliation.company_metadata || null,
      company_meta: affiliation.company_meta || null,
      company_parent_id: affiliation.company_parent_id || null,
      company_mcc: affiliation.company_mcc || null,
      document_number: affiliation.company_document_number || null,
      document_type: affiliation.company_document_type || null,
      provider_status_code: affiliation.provider_status_code,
      provider_status_message: affiliation.provider_status_message,
      anticipation_type: affiliation.anticipation_type || null,
      anticipation_day_start: affiliation.anticipation_day_start || null,
      allowed_capture_methods: affiliation.allowed_capture_methods || null,
      allowed_payment_methods: affiliation.allowed_payment_methods || null,
      anticipation_days_interval:
        affiliation.anticipation_days_interval || null,
      created_at: affiliation.created_at || null,
      updated_at: affiliation.updated_at || null,
      company_id: affiliation.company_id
    }
  })
}
