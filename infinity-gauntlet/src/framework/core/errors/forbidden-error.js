import StandardError from 'framework/core/errors/standard-error'

export default class ForbiddenError extends StandardError {
  constructor(locale) {
    super(403, 'errors.handlers.forbidden', locale)
  }
}
