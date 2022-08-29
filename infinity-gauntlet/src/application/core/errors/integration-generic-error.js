import ExternalRequestError from 'framework/core/errors/external-request-error'

export default class IntegrationGenericError extends ExternalRequestError {
  constructor(locale, err, integration) {
    super(500, 'errors.generic_integration', locale, err, integration)
  }
}
