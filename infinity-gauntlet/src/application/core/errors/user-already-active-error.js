import StandardError from 'framework/core/errors/standard-error'

export default class UserAlreadyActiveError extends StandardError {
  constructor(locale) {
    super(400, 'errors.user_already_active', locale)
  }
}
