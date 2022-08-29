/* eslint-disable no-await-in-loop */
import Transaction from 'application/core/models/transaction'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment'

const Logger = createLogger({
  name: 'MANUAL_FIX_CELER_TRANSACTIONS_DATES'
})

export default class ManualFixCelerTransactionsDates {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    let transactions
    try {
      transactions = await Transaction.find({
        captured_at: {
          $regex: '2022\\-12\\-31.*'
        }
      }).exec()
    } catch (err) {
      Logger.error({ err }, 'query-transactions-failed')
      throw err
    }

    const transactionsFound = transactions.length
    let transactionsUpdated = 0
    Logger.info({ transactionsFound }, 'query-transactions-completed')

    for (const transaction of transactions) {
      let new_date = transaction.captured_at.replace('2022-12-31', '2021-12-31')

      transaction.captured_at = new_date
      transaction.acquirer_created_at = new_date
      transaction.updated_at = moment()

      await transaction.save()
      transactionsUpdated++
    }

    Logger.info({ transactionsFound, transactionsUpdated }, 'proccess-finished')
  }
}
