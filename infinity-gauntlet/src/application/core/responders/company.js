import R from 'ramda'
import { mapModel } from 'application/core/helpers/responder'
import { feeRuleResponder } from 'application/core/responders/fee-rule'
import { userResponder } from 'application/core/responders/user'
import { hierarchyResponder } from 'application/core/responders/hierarchy'

export function companyResponder(model, user) {
  return mapModel(model, company => {
    const HasFeeRule = company.fee_rule

    if (!R.has('user_objects', company)) {
      company.user_objects = []
    }

    const response = {
      object: 'company',
      name: company.name || null,
      site_url: company.site_url || null,
      full_name: company.full_name || null,
      mcc: company.mcc || null,
      logo_url: company.logo_url || null,
      estimated_monthly_tpv: company.estimated_monthly_tpv || null,
      document_number: company.document_number || null,
      document_type: company.document_type || null,
      status: company.status || null,
      statusV2: company.statusV2 || null,
      transfer_configurations: company.transfer_configurations || {},
      id: company._id || null,
      partner_id: company.partner_id || null,
      contact: company.contact || null,
      provider_contact: company.provider_contact || null,
      created_at: company.created_at || null,
      updated_at: company.updated_at || null,
      main_capture_method: company.main_capture_method || null,
      capture_method_hardware_owner:
        company.capture_method_hardware_owner || null,
      email_configurations: company.email_configurations || null,
      fee_rule: HasFeeRule ? feeRuleResponder(company.fee_rule) : null,
      default_payment_provider: company.default_payment_provider || null,
      users: userResponder(company.user_objects),
      settlement_type: company.settlement_type || null,
      costs: company.costs || null,
      default_split_rules: company.default_split_rules || [],
      anticipation_type: company.anticipation_type || null,
      anticipation_days_interval: company.anticipation_days_interval || null,
      bank_account: company.bank_account || null,
      address: company.address || null,
      shipping_address: company.shipping_address || null,
      parent_id: company.parent_id || null,
      primary: company.primary,
      company_metadata: company.company_metadata || {},
      metadata: company.metadata ? JSON.parse(company.metadata) : null,
      hierarchy: hierarchyResponder(company.hierarchy, user),
      enabled_events: company.enabled_events || [],
      portfolio: company.portfolio
    }

    return response
  })
}
