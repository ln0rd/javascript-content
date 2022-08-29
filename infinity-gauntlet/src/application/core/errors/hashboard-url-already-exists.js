import StandardError from 'framework/core/errors/standard-error'

export default class HashboardUrlAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.hashboard_url_already_exists_error', locale)
  }
}
