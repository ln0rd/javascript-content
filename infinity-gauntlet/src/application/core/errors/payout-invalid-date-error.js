import StandardError from 'framework/core/errors/standard-error'

export class PayoutInvalidBusinessDateError extends StandardError {
  constructor(locale) {
    super(400, 'errors.payout_invalid_business_date_error', locale)
  }
}
