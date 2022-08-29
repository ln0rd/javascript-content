import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableToCreateMerchant extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_create_merchant', locale)
  }
}
