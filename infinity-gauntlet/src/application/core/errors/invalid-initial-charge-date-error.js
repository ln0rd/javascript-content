import StandardError from 'framework/core/errors/standard-error'

export default class InvalidInitialChargeDateError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_initial_charge_date', locale)
  }
}
