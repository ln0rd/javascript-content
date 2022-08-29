import StandardError from 'framework/core/errors/standard-error'

export default class AuthModeRequiredError extends StandardError {
  constructor(locale, authMode) {
    super(403, 'errors.auth_mode_required', locale, authMode)
  }
}
