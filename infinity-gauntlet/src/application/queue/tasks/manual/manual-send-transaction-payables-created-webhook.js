/* eslint-disable no-await-in-loop */
import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import { createLogger } from '@hashlab/logger'
import Payable from 'application/core/models/payable'
import Transaction from 'application/core/models/transaction'
import sendWebHook from 'application/webhook/helpers/deliverer'
import { transactionPayablesResponder } from 'application/core/responders/webhook/transaction-payables'

const Logger = createLogger({ name: 'MANUAL_SEND_SETTLEMENT_WEBHOOK' })

const WAITING_FUNDS = 'waiting_funds'
const PAID = 'paid'

export default class ManualSendTransactionPayablesCreatedWebhook {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info(
      { args },
      'manual-send-transaction-payables-created-webhook-started'
    )

    if (args.length !== 1 || args[0] === '') {
      throw new Error(
        'Invalid arguments. args[0] must be a URL pointing to a CSV file.'
      )
    }

    let transactions = []
    try {
      transactions = await fetchTransactionsFromCsv(args[0])
    } catch (err) {
      Logger.error({ err, args }, 'error-fetching-transactions-from-csv-file')
      throw new Error('Error Fetching transactions from CSV file')
    }
    for (const transaction of transactions) {
      const transactionId = transaction._id
      if (transaction.status !== PAID) {
        Logger.warn({ transactionId }, 'reverted-transaction')
        continue
      }
      const payables = await Payable.find({ transaction_id: transactionId })
        .lean()
        .exec()
      if (!payables) {
        Logger.warn({ transactionId }, 'no-payables-found-for-this-transaction')
        continue
      }
      try {
        await sendWebHook(
          transaction.iso_id,
          'transaction_payables_created',
          'transaction',
          transaction._id.toString(),
          null,
          WAITING_FUNDS,
          transactionPayablesResponder(payables, transaction)
        )
      } catch (err) {
        Logger.warn(
          { transactionId, err },
          'transaction-payables-webhook-failed'
        )
      }
    }
  }
}

async function fetchTransactionsFromCsv(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasTransactions = inputs.every(row => 'transactionId' in row)
  assert(
    hasTransactions,
    'Malformed input CSV. It must have "transactionId" fields.'
  )
  const transactionsIds = inputs.map(({ transactionId }) => transactionId)
  return Transaction.find({
    _id: { $in: transactionsIds }
  })
    .lean()
    .exec()
}
