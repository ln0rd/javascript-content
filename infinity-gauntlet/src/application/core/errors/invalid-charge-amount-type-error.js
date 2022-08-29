import StandardError from 'framework/core/errors/standard-error'

export default class InvalidChargeAmountTypeError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_charge_amount_type', locale)
  }
}
