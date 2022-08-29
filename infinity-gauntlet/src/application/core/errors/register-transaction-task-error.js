import StandardError from 'framework/core/errors/standard-error'

export default class RegisterTransactionTaskError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.register_transaction_task', locale, err.message)

    this.previousMessage = err.message
    this.previousStack = err.stack
    this.__DO_NOT_RETRY__ = err.__DO_NOT_RETRY__
    this.context = err.context
  }
}
