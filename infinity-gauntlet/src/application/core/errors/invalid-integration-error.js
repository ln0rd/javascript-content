import StandardError from 'framework/core/errors/standard-error'

export default class InvalidIntegrationError extends StandardError {
  constructor(locale, integration) {
    super(400, 'errors.invalid_integration', locale, integration)
  }
}
