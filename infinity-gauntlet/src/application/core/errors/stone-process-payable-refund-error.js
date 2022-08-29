import StandardError from 'framework/core/errors/standard-error'

export default class StoneProcessPayableRefundError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_process_payable_refund', locale)
  }
}
