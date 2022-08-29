import StandardError from 'framework/core/errors/standard-error'

export default class InvalidUserMetadataError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_user_metadata', locale)
  }
}
