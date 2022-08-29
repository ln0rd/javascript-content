import StandardError from 'framework/core/errors/standard-error'

export default class InternalServerError extends StandardError {
  constructor(locale, err = {}, opts = {}) {
    super(500, 'errors.handlers.internal_server', locale, opts)

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
