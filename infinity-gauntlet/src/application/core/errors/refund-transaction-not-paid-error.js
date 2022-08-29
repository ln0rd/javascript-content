import StandardError from 'framework/core/errors/standard-error'

export default class RefundTransactionNotPaidError extends StandardError {
  constructor(locale, transaction) {
    super(400, 'errors.refund_transaction_not_paid', locale)
    this.transaction = transaction
  }
}
