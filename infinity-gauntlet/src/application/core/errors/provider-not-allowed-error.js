import StandardError from 'framework/core/errors/standard-error'

export default class ProviderNotAllowedError extends StandardError {
  constructor(locale, provider) {
    super(400, 'errors.provider_not_allowed', locale, provider)
  }
}
