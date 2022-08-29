import createLogger from 'framework/core/adapters/logger'
import PagsClient from '@hashlab/pags-client'
import assert from 'assert'
import { path } from 'ramda'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import CheckoutService from 'application/core/services/checkout'
import {
  toHashStatus,
  toHashPaymentMethod,
  toHashCardBrand
} from 'application/core/providers/acquirers/pags/translator'
import ExternalWebhookGenericError from 'application/core/errors/external-webhook-generic-error'
import InternalServerError from 'framework/core/errors/internal-server-error'

const { pags } = config.providers.acquisition

const Logger = createLogger({
  name: 'PAGS_ACQUISITION_WEBHOOK_SERVICE'
})

export default class PagsAcquisitionWebhookService {
  constructor() {
    assert(
      pags.api_url,
      'Required PROVIDER_PAGS_ACQUISITION_API_URL env variable not found'
    )
    assert(
      pags.api_email,
      'Required PROVIDER_PAGS_ACQUISITION_API_EMAIL env variable not found'
    )
    assert(
      pags.api_token,
      'Required PROVIDER_PAGS_ACQUISITION_API_TOKEN env variable not found'
    )

    this.client = this.getClient()
  }

  isApplicable(req) {
    const isAcquisitionAccount =
      req.query.hash_account && req.query.hash_account === 'acquisition'

    const isUrlEncoded = req.is('application/x-www-form-urlencoded')
    const hasPagsFields =
      !!path(['body', 'notificationCode'], req) &&
      !!path(['body', 'notificationType'], req)

    const notificationTypeIsTransaction =
      path(['body', 'notificationType'], req) === 'transaction'

    return (
      isAcquisitionAccount &&
      isUrlEncoded &&
      hasPagsFields &&
      notificationTypeIsTransaction
    )
  }

  async handle(req) {
    Logger.info({ body: req.body }, 'handling-pags-acquisition-webhook')

    const notificationId = req.body.notificationCode
    let response
    try {
      response = await this.client.getNotification(notificationId)
    } catch (err) {
      Logger.error(
        { err },
        'error-getting-notification-details-pags-acquisition-webhook'
      )

      throw new InternalServerError(
        frameworkConfig.core.i18n.defaultLocale,
        err,
        'pags'
      )
    }

    Logger.info({ response }, 'pags-acquisition-notification-response')

    return this.sendToAcquisitionService(response.transaction)
  }

  async sendToAcquisitionService(transaction) {
    try {
      const hashStatus = toHashStatus(transaction.status)
      const paymentMethod = toHashPaymentMethod(transaction.paymentMethod.type)
      const cardBrand = toHashCardBrand(transaction.paymentMethod.code)

      const payload = {
        amount: Math.round(Number(transaction.grossAmount) * 100).toString(),
        status: hashStatus,
        paymentMethod: paymentMethod,
        cardBrand: cardBrand,
        date: transaction.lastEventDate
      }

      await CheckoutService.updateOrderPayment(transaction.code, payload)

      Logger.info(
        { transaction_id: transaction.code },
        'transaction-sent-to-acquisition-service'
      )

      return { status: 'ok' }
    } catch (err) {
      Logger.error({ err }, 'failed-to-send-transaction-to-acquisition-service')

      throw new ExternalWebhookGenericError(
        frameworkConfig.core.i18n.defaultLocale,
        err,
        'pags'
      )
    }
  }

  getClient() {
    return new PagsClient({
      host: pags.api_url,
      email: pags.api_email,
      token: pags.api_token
    })
  }
}
