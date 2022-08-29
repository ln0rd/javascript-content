/* eslint-disable no-await-in-loop */
import R from 'ramda'
import Transaction from 'application/core/models/transaction'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment'

const Logger = createLogger({
  name: 'MANUAL_FIX_TRANSACTIONS_CAPTURE_DATES'
})

export default class ManualFixTransactionsCaptureDates {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    if (args.length !== 3) {
      throw new Error(
        'Invalid arguments. Usage:<ID_LIST>,<OLD_CAPTURE_DATE>,<NEW_CAPTURE_DATE>'
      )
    }

    const ids = R.split(';', args[0])
    Logger.info({ ids }, 'transaction-ids')

    if (ids.length === 0 || ids[0].length === 0) {
      throw new Error('Missing transaction IDs. args[0] cannot be empty')
    }

    let transactions
    try {
      transactions = await Transaction.find({
        _id: {
          $in: ids
        }
      }).exec()
    } catch (err) {
      Logger.error({ err }, 'query-transactions-failed')
      throw err
    }

    const transactionsFound = transactions.length
    let transactionsUpdated = 0
    Logger.info({ transactionsFound }, 'query-transactions-completed')

    if (transactionsFound > ids.length) {
      throw new Error('More transactions found than expected.')
    }

    for (const transaction of transactions) {
      let new_date = transaction.captured_at.replace(args[1], args[2])

      if (
        transaction.captured_at !== new_date &&
        transaction.acquirer_created_at !== new_date
      ) {
        transaction.captured_at = new_date
        transaction.acquirer_created_at = new_date
        transaction.updated_at = moment()

        await transaction.save()
        transactionsUpdated++

        Logger.info(transaction.id, 'transaction updated')
      }
    }

    Logger.info({ transactionsFound, transactionsUpdated }, 'proccess-finished')
  }
}
