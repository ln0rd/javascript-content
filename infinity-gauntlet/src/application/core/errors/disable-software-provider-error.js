import StandardError from 'framework/core/errors/standard-error'

export default class DisableSoftwareProviderError extends StandardError {
  constructor(locale, provider) {
    super(400, 'errors.disable_software_provider', locale, provider)
  }
}
