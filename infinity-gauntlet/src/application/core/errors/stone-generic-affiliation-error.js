import StandardError from 'framework/core/errors/standard-error'

export default class StoneGenericAffiliationError extends StandardError {
  constructor(locale, error) {
    super(400, 'errors.stone_generic_affiliation', locale, error.message)
  }
}
