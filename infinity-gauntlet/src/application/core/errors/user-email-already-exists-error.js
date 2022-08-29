import StandardError from 'framework/core/errors/standard-error'

export default class UserEmailAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.user_email_already_exists', locale)
  }
}
