import StandardError from 'framework/core/errors/standard-error'

export default class TransactionProviderRefundError extends StandardError {
  constructor(locale) {
    super(400, 'errors.transaction_provider_refund', locale)
  }
}
