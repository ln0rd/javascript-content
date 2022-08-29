import StandardError from 'framework/core/errors/standard-error'

export default class AffiliationDisabledError extends StandardError {
  constructor(locale, cause) {
    super(400, 'errors.affiliation_disabled', locale, cause)
  }
}
