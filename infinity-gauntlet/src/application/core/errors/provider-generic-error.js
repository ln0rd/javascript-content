import ExternalRequestError from 'framework/core/errors/external-request-error'

export default class ProviderGenericError extends ExternalRequestError {
  constructor(locale, err, provider) {
    super(500, 'errors.generic_provider', locale, err, provider)
  }
}
