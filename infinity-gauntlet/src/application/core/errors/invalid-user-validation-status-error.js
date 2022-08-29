import StandardError from 'framework/core/errors/standard-error'

export default class InvalidUserValidationStatusError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_user_validation_status', locale)
  }
}
