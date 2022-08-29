import StandardError from 'framework/core/errors/standard-error'

export default class TransactionNotRefundedOnProviderError extends StandardError {
  constructor(locale) {
    super(400, 'errors.transaction_not_refunded_on_provider', locale)
  }
}
