import StandardError from 'framework/core/errors/standard-error'

export default class ExpiredTokenError extends StandardError {
  constructor(locale) {
    super(422, 'errors.handlers.expired_token', locale)
  }
}
