import BoilerplateAcquirer from 'application/core/providers/acquirers/boilerplate'
import Transaction from 'application/core/models/transaction'
import assert from 'assert'
import axios from 'axios'
import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'HASH_ACQUIRER'
})

/*
  Acquirer Interface implementation for Transactions Acquired by Hash Network
*/
export default class HashAcquirer extends BoilerplateAcquirer {
  constructor(locale) {
    super(locale)
    this.locale = locale
  }

  /*
   Initial version, just retrieve information from collection.
   Next step: implement Transaction Service Client
  */
  async getTransaction(_, transactionId) {
    assert(transactionId, 'A Transaction ID is required')

    Logger.info({ transactionId }, 'getting-transaction')

    return await Transaction.findOne({
      provider_transaction_id: transactionId
    })
      .lean()
      .exec()
  }

  /**
   * @return {{
   *  status: Boolean
   * }}
   */
  async refundTransaction(amount, transaction, affiliation) {
    const transactionId = transaction.provider_transaction_id
    const url = config.providers.acquirers.hash.transaction_service_url
    const refundUrl = `${url}/transactions/${transactionId}/refund`
    const auth = {
      username: config.providers.acquirers.hash.transaction_service_auth_user,
      password:
        config.providers.acquirers.hash.transaction_service_auth_password
    }

    Logger.info(
      { amount, transaction, affiliation, transactionId },
      'creating-refund'
    )

    try {
      await axios.post(refundUrl, null, {
        auth: auth,
        validateStatus: status => status === 201
      })
    } catch (err) {
      Logger.error(
        { amount, transaction, affiliation, transactionId, err },
        'refund-transaction-failed'
      )
      throw err
    }

    Logger.info(
      { amount, transaction, affiliation, transactionId },
      'transaction-refunded'
    )

    return { success: true }
  }
}
