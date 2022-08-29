import StandardError from 'framework/core/errors/standard-error'

export default class InvalidProviderError extends StandardError {
  constructor(locale, provider) {
    super(400, 'errors.invalid_provider', locale, provider)
  }
}
