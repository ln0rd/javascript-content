import PagsWebhookService from './webhooks/pags-webhook'
import PagsAcquisitionWebhookService from './webhooks/pags-acquisition-webhook'
import CardProcessorWebhookService from './webhooks/card-processor-webhook'
import PinfraWebhookService from './webhooks/pinfra-webhook'
import BadRequestError from 'framework/core/errors/bad-request-error'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'EXTERNAL_WEBHOOK_SERVICE'
})

const STRATEGIES = [
  new PagsAcquisitionWebhookService(),
  new PagsWebhookService(),
  new CardProcessorWebhookService(),
  new PinfraWebhookService()
]

export default class ExternalWebhookHandler {
  static async handle(req) {
    const strategy = STRATEGIES.find(strat => strat.isApplicable(req))

    if (!strategy) {
      Logger.error({ req }, 'no-strategy-found-for-webhook')
      throw new BadRequestError(frameworkConfig.core.i18n.defaultLocale)
    }

    return await strategy.handle(req)
  }
}
