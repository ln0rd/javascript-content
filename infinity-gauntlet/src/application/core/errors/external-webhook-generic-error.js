import StandardError from 'framework/core/errors/standard-error'

export default class ExternalWebhookGenericError extends StandardError {
  constructor(locale, err, integration) {
    super(500, 'errors.external_webhook_generic', locale, err, integration)

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
