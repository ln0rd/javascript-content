/* eslint-disable no-await-in-loop */
import Transaction from 'application/core/models/transaction'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MANUAL_RESOLVE_DUPLICATED_TRANSACTIONS' })

export default class ManualResolveDuplicatedTransactions {
  static type() {
    return 'manual'
  }

  static async getDuplicatedTransactions() {
    const duplicatedTransactions = await Transaction.aggregate([
      {
        $group: {
          _id: {
            provider: '$provider',
            provider_transaction_id: '$provider_transaction_id'
          },
          count: { $sum: 1 },
          created_at: { $min: '$created_at' },
          transactions_with_same_ids: {
            $addToSet: { _id: '$_id', created_at: '$created_at' }
          }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { created_at: 1 } }
    ]).allowDiskUse(true)

    return duplicatedTransactions
  }

  static async fixProviderTransactionId(sameIds) {
    sameIds.shift()

    for (let i = 0; i < sameIds.length; i++) {
      const transaction = await Transaction.findById(
        sameIds[parseInt(i)]
      ).exec()

      const oldProviderTransactionId = transaction.provider_transaction_id
      const newProviderTransactionId = `${oldProviderTransactionId}_${i}`

      transaction.provider_transaction_id = newProviderTransactionId
      await transaction.save()

      Logger.info(
        {
          id: transaction._id.toString(),
          old_provider_transaction_id: oldProviderTransactionId,
          new_provider_transaction_id: newProviderTransactionId
        },
        'transaction-updated'
      )
    }
  }

  static async handler(args) {
    Logger.info({ args }, 'manual-resolve-duplicated-transactions-started')

    const duplicatedTransactions = await this.getDuplicatedTransactions()

    Logger.info(
      { count: duplicatedTransactions.length },
      'transactions-duplicated-found'
    )

    for (const transaction of duplicatedTransactions) {
      const sameIds = transaction.transactions_with_same_ids
        .map(elem => {
          return elem._id
        })
        .sort((a, b) => {
          return a - b
        })
      await this.fixProviderTransactionId(sameIds)
    }
  }
}
