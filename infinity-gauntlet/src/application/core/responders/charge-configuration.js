import { mapModel } from 'application/core/helpers/responder'

export function chargeConfigurationResponder(model) {
  return mapModel(model, config => {
    return {
      object: 'charge_configuration',
      id: config._id,
      description: config.description,
      charge_method: config.charge_method,
      model: config.model,
      model_id: config.model_id,
      status: config.status,
      amount: config.amount,
      initial_charge_date: config.initial_charge_date,
      next_charge_date: config.next_charge_date,
      executed_charges: config.executed_charges,
      interval: config.interval,
      charges: config.charges,
      destination_company_id: config.destination_company_id,
      created_at: config.created_at || null,
      updated_at: config.updated_at || null,
      company_id: config.company_id
    }
  })
}
