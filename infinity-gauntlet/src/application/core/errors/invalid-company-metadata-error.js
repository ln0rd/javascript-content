import StandardError from 'framework/core/errors/standard-error'

export default class InvalidCompanyMetadataError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_company_metadata', locale)
  }
}
