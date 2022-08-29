import StandardError from 'framework/core/errors/standard-error'

export default class StoneGetAffiliationError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_get_affiliation', locale)
  }
}
