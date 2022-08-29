import StandardError from 'framework/core/errors/standard-error'

export default class TransactionAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.transaction_already_exists', locale)
  }
}
