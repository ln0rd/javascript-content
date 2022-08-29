import StandardError from 'framework/core/errors/standard-error'

export default class InvalidWalletAmountError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_wallet_amount', locale)
  }
}
