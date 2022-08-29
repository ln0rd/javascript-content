import StandardError from 'framework/core/errors/standard-error'

export default class CreatePayablesTaskError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.create_payables_task', locale, err.message)

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
