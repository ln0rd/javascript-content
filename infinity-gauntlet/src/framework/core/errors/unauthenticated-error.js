import StandardError from 'framework/core/errors/standard-error'

export default class UnauthenticatedError extends StandardError {
  constructor(locale, method) {
    super(401, 'errors.handlers.unauthenticated', locale, method)
  }
}
