import StandardError from 'framework/core/errors/standard-error'

export default class NotImplementedError extends StandardError {
  constructor(locale) {
    super(501, 'errors.handlers.not_implemented', locale)
  }
}
