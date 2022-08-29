import StandardError from 'framework/core/errors/standard-error'

export default class StoneTransactionCanceledError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_transaction_canceled', locale)
  }
}
