import assert from 'assert'
import { path } from 'ramda'

import createLogger from 'framework/core/adapters/logger'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'

import { registerTransaction } from './register-transaction'
import { refundTransaction } from './refund-transaction'
import { registerDispute } from './register-dispute'
import { toHashStatus } from 'application/core/providers/acquirers/pags/translator'

import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'
import ExternalWebhookGenericError from 'application/core/errors/external-webhook-generic-error'
import InternalServerError from 'framework/core/errors/internal-server-error'
import { throwWithContext } from 'application/core/helpers/error'

import {
  getPagsAcquirerFromProvider,
  getClient
} from 'application/core/providers/acquirers/pags/helpers'

const { pags } = config.providers.acquirers
const locale = frameworkConfig.core.i18n.defaultLocale
const merge = Object.assign

const Logger = createLogger({
  name: 'PAGS_WEBHOOK_SERVICE'
})

export default class PagsWebhookService {
  constructor() {
    assert(
      pags.api_url,
      'Required PROVIDER_PAGS_API_URL env variable not found'
    )
  }

  isApplicable(req) {
    const isUrlEncoded = req.is('application/x-www-form-urlencoded')
    const hasPagsFields =
      !!path(['body', 'notificationCode'], req) &&
      !!path(['body', 'notificationType'], req)

    const hasAcquirerAccount = req.query.acquirerAccount !== undefined

    const notificationTypeIsTransaction =
      path(['body', 'notificationType'], req) === 'transaction'

    return (
      isUrlEncoded &&
      hasPagsFields &&
      notificationTypeIsTransaction &&
      hasAcquirerAccount
    )
  }

  /**
   * Handles a Pags Webhook Notification.
   *
   * Requires the `req.query.acquirerAccount` to define
   * which account credentials will be used while fetching the
   * notification data.
   *
   * @param {Object} req The rXequest data
   */
  async handle(req) {
    Logger.info({ body: req.body, query: req.query }, 'handling-pags-webhook')

    const acquirerAccountId = req.query.acquirerAccount
    if (!acquirerAccountId) {
      throwWithContext(new InvalidParameterError(locale, 'acquirerAccount'), {
        msg: 'invalid-acquirer-account',
        acquirerAccountId
      })
    }

    // To avoid useless fetching of data that barely changes.
    if (!this.acquirerData) {
      try {
        this.acquirerData = await getPagsAcquirerFromProvider('hash')
      } catch (err) {
        throwWithContext(
          new ExternalWebhookGenericError(locale, err, 'pags'),
          merge({ msg: err.message }, err.context)
        )
      }
    }

    let client
    try {
      client = await getClient(acquirerAccountId, this.acquirerData.credentials)
    } catch (err) {
      let error

      if (err.message === 'no-pags-credential-found-for-acquirer-account') {
        error = new InvalidParameterError(locale, 'acquirerAccount')
      } else {
        error = new ExternalWebhookGenericError(locale, {}, 'pags')
      }

      throwWithContext(error, merge({ msg: err.message }, err.context))
    }

    const notificationId = req.body.notificationCode
    let response
    try {
      response = await client.getNotification(notificationId)
    } catch (err) {
      Logger.error({ err }, 'error-getting-notification-details')

      throwWithContext(
        new InternalServerError(locale, err, 'pags'),
        merge({ msg: 'error-getting-notification-details' }, err.context)
      )
    }

    Logger.info({ response }, 'pags-notification-response')

    const hashStatus = toHashStatus(response.transaction.status)

    // Persistent information, transaction acquired by Pags Network
    // Data field is not acquired_by to avoid misunderstanding with acquirer_name.
    response.transaction.captured_by = 'pags'

    // Acquirer Account Identifier to identify Acquirer Credentials for transaction
    response.transaction.acquirer_account_id = acquirerAccountId

    switch (hashStatus) {
      case 'paid':
      case 'refused':
        return sendToBeRegistered(response.transaction)
      case 'refunded':
        return sendToBeRefunded(response.transaction)
      case 'chargedback':
        return sendToDispute(response.transaction)
      default:
        throw new ExternalWebhookGenericError(
          locale,
          new Error('Unsupported Webhook Status'),
          'pags'
        )
    }

    async function sendToBeRegistered(transaction) {
      try {
        await registerTransaction(transaction)

        Logger.info(
          { transaction_id: transaction.code },
          'transaction-sent-to-registration-queue'
        )

        return { status: 'ok' }
      } catch (err) {
        Logger.error({ err }, 'failed-to-send-transaction-to-register-queue')

        throw new ExternalWebhookGenericError(locale, err, 'pags')
      }
    }

    async function sendToBeRefunded(transaction) {
      try {
        await refundTransaction(transaction)

        Logger.info(
          { transaction_id: transaction.code },
          'transaction-sent-to-refund-queue'
        )

        return { status: 'ok' }
      } catch (err) {
        Logger.error({ err }, 'failed-to-send-transaction-to-refund-queue')

        throw new ExternalWebhookGenericError(locale, err, 'pags')
      }
    }

    async function sendToDispute(transaction) {
      try {
        await registerDispute(transaction)

        Logger.info(
          { transaction_id: transaction.code },
          'transaction-sent-to-dispute-queue'
        )

        return { status: 'ok' }
      } catch (err) {
        Logger.error(
          { err, transaction_id: transaction.code },
          'failed-to-send-transaction-to-dispute-queue'
        )

        throw new ExternalWebhookGenericError(locale, err, 'pags')
      }
    }
  }
}
