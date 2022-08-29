import StandardError from 'framework/core/errors/standard-error'

export default class AffiliationAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.affiliation_already_exists', locale)
  }
}
