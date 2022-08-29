import StandardError from 'framework/core/errors/standard-error'

export default class InvalidSessionParametersError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_session_parameters', locale)
  }
}
