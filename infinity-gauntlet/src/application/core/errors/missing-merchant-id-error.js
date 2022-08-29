import StandardError from 'framework/core/errors/standard-error'

export default class MissingMerchantIdError extends StandardError {
  constructor(locale) {
    super(400, 'errors.missing_merchant_id', locale)
  }
}
