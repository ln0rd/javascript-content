import StandardError from 'framework/core/errors/standard-error'

export default class ChargeAlreadyProcessedError extends StandardError {
  constructor(locale) {
    super(400, 'errors.charge_already_processed', locale)
  }
}
