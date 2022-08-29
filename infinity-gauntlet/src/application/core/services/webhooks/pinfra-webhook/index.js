import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import Transaction from 'application/core/models/transaction'
import TransactionService from 'application/core/services/transaction'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'
import assert from 'assert'
import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import { OAuth2Client } from 'google-auth-library'
import { parseTransactionEventData } from 'application/core/helpers/transaction'
import { publishMessage } from 'framework/core/adapters/queue'
import { translate } from 'framework/core/adapters/i18n'
import RefundTransactionNotPaidError from 'application/core/errors/refund-transaction-not-paid-error'
import { transactionResponder } from 'application/core/responders/transaction'

const locale = frameworkConfig.core.i18n.defaultLocale
const Logger = createLogger({ name: 'PINFRA_WEBHOOK_SERVICE' })
const hashConfig = config.providers.capture_softwares.hash
const authClient = new OAuth2Client()

export default class PinfraWebhookService {
  constructor() {
    assert(
      hashConfig.transaction_event_subscription_id,
      'Required TRANSACTION_EVENT_SUBSCRIPTION_ID environment variable not found'
    )
  }

  isApplicable(req) {
    return (
      req.body &&
      req.body.message &&
      req.body.message.data &&
      req.body.message.messageId &&
      req.body.subscription &&
      req.body.subscription === hashConfig.transaction_event_subscription_id
    )
  }

  async loadOriginalTransaction(providerTransactionId) {
    const originalTransaction = await Transaction.findOne({
      provider_transaction_id: providerTransactionId
    })
      .select('_id')
      .lean()
      .exec()

    if (!originalTransaction || !originalTransaction._id) {
      Logger.error({ providerTransactionId }, 'original-transaction-not-found')
      throw new ModelNotFoundError(
        locale,
        translate('models.transaction', locale)
      )
    }

    return originalTransaction
  }

  async processPurchase(transactionData) {
    const response = await TransactionService.queueRegister(
      locale,
      transactionData,
      transactionData.company_id
    )
    return response
  }

  async processRefund(providerTransactionId, transactionData) {
    const originalTransaction = await this.loadOriginalTransaction(
      providerTransactionId
    )

    let response
    try {
      response = await TransactionService.registerRefund(
        locale,
        originalTransaction._id.toString(),
        transactionData,
        transactionData.company_id
      )
    } catch (e) {
      if (
        e instanceof RefundTransactionNotPaidError &&
        e.transaction.status === 'refunded'
      ) {
        return transactionResponder(e.transaction)
      }
      throw e
    }

    return response
  }

  async processChargeback(providerTransactionId) {
    const originalTransaction = await this.loadOriginalTransaction(
      providerTransactionId
    )
    const body = { transaction_id: originalTransaction._id }
    const result = await publishMessage(
      'RegisterDispute',
      Buffer.from(JSON.stringify(body))
    ).catch(err => {
      Logger.error({ err, formatedBody: body }, 'failed-to-enqueue-dispute')
      throw err
    })
    return result
  }

  async handle(req) {
    const cloudEvent = JSON.parse(
      Buffer.from(req.body.message.data, 'base64').toString('utf-8')
    )
    Logger.info({ cloudEvent }, 'handling-pinfra-webhook')

    // Verify JWT Token
    // https://cloud.google.com/pubsub/docs/push#authentication_and_authorization
    try {
      const bearer = req.header('Authorization')
      const [, token] = bearer.match(/Bearer (.*)/)
      await authClient.verifyIdToken({
        idToken: token,
        audience: hashConfig.transaction_event_audience
      })
    } catch (err) {
      Logger.error({ err }, 'jwt-validation-failed')
      throw new UnauthorizedError(locale, 'jwt-validation-failed')
    }

    // Parse transaction event data
    const transactionData = parseTransactionEventData(cloudEvent)
    transactionData.captured_by_hash = true

    // Register transaction
    const providerTransactionId = cloudEvent.data.referenceTransactionID
    switch (cloudEvent.data.transactionType) {
      case 'purchase':
        return this.processPurchase(transactionData)
      case 'purchase-reversal':
        return this.processRefund(providerTransactionId, transactionData)
      case 'chargeback':
        return this.processChargeback(providerTransactionId)
    }
  }
}
