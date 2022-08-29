import StandardError from 'framework/core/errors/standard-error'

export default class ValidationPayoutAlreadyExists extends StandardError {
  constructor(locale) {
    super(412, 'errors.validation_payout_already_exists', locale)
  }
}
