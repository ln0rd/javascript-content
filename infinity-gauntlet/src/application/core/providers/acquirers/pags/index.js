import assert from 'assert'
import createLogger from 'framework/core/adapters/logger'
import config from 'application/core/config'
import {
  toHashPaymentMethod,
  toHashStatus,
  toHashCardBrand
} from './translator'
import BoilerplateAcquirer from 'application/core/providers/acquirers/boilerplate'
import { throwWithContext } from 'application/core/helpers/error'
import InternalServerError from 'framework/core/errors/internal-server-error'
import {
  getPagsAcquirerFromProvider,
  getClient
} from 'application/core/providers/acquirers/pags/helpers'

const { pags } = config.providers.acquirers

const Logger = createLogger({
  name: 'PAGS_ACQUIRER'
})

export default class PagsAcquirer extends BoilerplateAcquirer {
  constructor(locale) {
    super(locale)

    assert(
      pags.api_url,
      'Required PROVIDER_PAGS_API_URL env variable not found'
    )

    this.locale = locale
  }

  /**
   * Get Client using right credentials from Provider Collection to call Pags method.
   *
   * @param {Object} affiliation - Merchant affiliation
   * @param {Object} transaction - Transaction data
   *
   * @return PagsClient with right credentials
   */
  async getTransactionClient(affiliation, transaction) {
    const accountID =
      transaction.acquirer_account_id || affiliation.internal_merchant_id

    if (!this.acquirerData) {
      try {
        this.acquirerData = await getPagsAcquirerFromProvider(
          affiliation.provider
        )
      } catch (err) {
        throwWithContext(
          new InternalServerError(this.locale, err, 'pags'),
          Object.assign(
            { msg: 'error-getting-acquirer-details-from-provider' },
            err.context
          )
        )
      }
    }

    let client
    try {
      client = await getClient(accountID, this.acquirerData.credentials)
    } catch (err) {
      throwWithContext(
        new InternalServerError(this.locale, err, 'pags'),
        Object.assign({ msg: 'error-getting-pags-client' }, err.context)
      )
    }

    return client
  }

  /**
   * Fetches transaction details from Pags' API
   *
   * @param {Object} affiliation - Merchant affiliation
   * @param {String} transactionId - Pags Transaction ID/Code
   * @param {Object} transactionData - Current transaction data
   *
   * @return {{
   *  provider_transaction_id: String,
   *  amount: Number,
   *  serial_number: String,
   *  payment_method: String,
   *  provider: String,
   *  status: String,
   *  card_brand: String,
   *  acquirer_created_at: String,
   *  acquirer_name: String
   * }}
   */
  async getTransaction(affiliation, transactionId, transactionData) {
    assert(transactionId, 'A Pags Transaction ID is required')

    Logger.info({ transactionId }, 'getting-transaction')

    let client
    try {
      client = await this.getTransactionClient(affiliation, transactionData)
    } catch (err) {
      Logger.error({ err }, 'get-transaction-client-failed')
      throw err
    }

    let transaction
    try {
      const response = await client.getTransaction(transactionId)
      transaction = response.transaction
    } catch (err) {
      Logger.error({ err }, 'get-transaction-details-failed')
      throw err
    }

    Logger.info({ transaction }, 'found-pags-transaction')

    return {
      provider_transaction_id: transaction.code,
      amount: Math.round(Number(transaction.grossAmount) * 100),
      serial_number: transaction.deviceInfo
        ? transaction.deviceInfo.serialNumber
        : undefined,
      payment_method: toHashPaymentMethod(transaction.paymentMethod.type),
      status: toHashStatus(transaction.status),
      card_brand: toHashCardBrand(transaction.paymentMethod.code),
      acquirer_created_at: transaction.date,
      provider: affiliation.provider,
      acquirer_name: 'pags'
    }
  }

  /**
   * Refund transaction using PagS API
   *
   * @param {Object} transaction - PagS Transaction to be refund
   * @param {Object} affiliation - The merchant's affiliation
   *
   * @return {{
   *  status: Boolean
   * }}
   */
  async refundTransaction(_, transaction, affiliation) {
    const transactionId = transaction.provider_transaction_id

    Logger.info({ transactionId }, 'creating-refund')

    let client
    try {
      client = await this.getTransactionClient(affiliation, transaction)
    } catch (err) {
      Logger.err({ err }, 'refund-transaction-get-provider-failed')
      throw err
    }

    try {
      await client.createRefund(transactionId)
    } catch (err) {
      Logger.error({ err }, 'refund-transaction-failed')
      throw err
    }

    Logger.info({ transactionId }, 'transaction-refunded')

    return {
      success: true
    }
  }
}
