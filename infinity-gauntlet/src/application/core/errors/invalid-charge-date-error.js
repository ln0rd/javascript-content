import StandardError from 'framework/core/errors/standard-error'

export default class InvalidChargeDateError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_charge_date', locale)
  }
}
