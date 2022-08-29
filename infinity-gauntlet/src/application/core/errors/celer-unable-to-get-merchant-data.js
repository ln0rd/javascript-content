import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableGetMerchantData extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_get_merchant_data', locale)
  }
}
