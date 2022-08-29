import StandardError from 'framework/core/errors/standard-error'

export default class StoneAffiliationNotChangedError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_affiliation_not_changed', locale)
  }
}
