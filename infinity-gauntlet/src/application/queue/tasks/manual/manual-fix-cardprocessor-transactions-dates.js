/* eslint-disable no-await-in-loop */
import Transaction from 'application/core/models/transaction'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment'

const Logger = createLogger({
  name: 'MANUAL_FIX_CARDPROCESSOR_TRANSACTIONS_DATES'
})

export default class ManualFixCardprocessorTransactionsDates {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    let transactions
    try {
      transactions = await Transaction.find({ captured_by: 'hash' }).exec()
    } catch (err) {
      Logger.error({ err }, 'query-transactions-failed')
      throw err
    }

    const transactionsFound = transactions.length
    let transactionsUpdated = 0
    Logger.info({ transactionsFound }, 'query-transactions-completed')

    for (const transaction of transactions) {
      transaction.captured_at = moment(transaction.captured_at).format()
      transaction.acquirer_created_at = moment(
        transaction.acquirer_created_at
      ).format()
      await transaction.save()
      transactionsUpdated++
    }

    Logger.info({ transactionsFound, transactionsUpdated }, 'proccess-finished')
  }
}
