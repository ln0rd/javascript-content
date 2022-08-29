import StandardError from 'framework/core/errors/standard-error'

export default class InvalidChargeProcessingCostError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_charge_processing_cost', locale)
  }
}
