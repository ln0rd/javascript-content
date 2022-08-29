import StandardError from 'framework/core/errors/standard-error'

export default class UnauthorizedError extends StandardError {
  constructor(locale, method) {
    super(403, 'errors.handlers.unauthorized', locale, method)
  }
}
