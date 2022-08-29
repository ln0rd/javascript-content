import StandardError from 'framework/core/errors/standard-error'

export default class StoneRequiredAffiliationKeyError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_required_affiliation_key', locale)
  }
}
