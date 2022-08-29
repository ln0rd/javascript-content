import { mapModel } from 'application/core/helpers/responder'

export function hardwareResponder(model) {
  return mapModel(model, hardware => {
    return {
      object: 'capture_hardware',
      id: hardware._id,
      status: hardware.status,
      provider: hardware.provider,
      software_provider: hardware.software_provider,
      hardware_provider: hardware.hardware_provider || null,
      terminal_type: hardware.terminal_type || null,
      terminal_model: hardware.terminal_model || null,
      serial_number: hardware.serial_number || null,
      negotiation_type: hardware.negotiation_type || null,
      negotiation_amount: hardware.negotiation_amount || null,
      negotiation_installments: hardware.negotiation_installments || null,
      logical_number: hardware.logical_number || null,
      provider_status_code: hardware.provider_status_code || null,
      provider_status_message: hardware.provider_status_message || null,
      created_at: hardware.created_at || null,
      updated_at: hardware.updated_at || null,
      company_id: hardware.company_id
    }
  })
}
