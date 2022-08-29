import StandardError from 'framework/core/errors/standard-error'

export default class UserNotActiveError extends StandardError {
  constructor(locale) {
    super(400, 'errors.user_not_active', locale)
  }
}
