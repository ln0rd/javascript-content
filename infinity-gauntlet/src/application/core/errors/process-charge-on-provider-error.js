import StandardError from 'framework/core/errors/standard-error'

export default class ProcessChargeOnProviderError extends StandardError {
  constructor(locale) {
    super(400, 'errors.process_charge_on_provider', locale)
  }
}
