import StandardError from 'framework/core/errors/standard-error'

export default class StoneGenericRefundError extends StandardError {
  constructor(locale, error) {
    super(400, 'errors.stone_generic_refund', locale, error.message)
  }
}
