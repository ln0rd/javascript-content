import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import createLogger from 'framework/core/adapters/logger'
import WebHookEvent from 'application/webhook/models/event'
import sendWebHook from 'application/webhook/helpers/deliverer'

const Logger = createLogger({ name: 'MANUAL_FIX_NEON_PAYABLES_WEBHOOKS' })

export default class ManualFixNeonPayablesWebhooks {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'manual-fix-neon-payables-webhooks-started')

    if (args.length !== 1 || args[0] === '') {
      throw new Error(
        'Invalid arguments. args[0] must be a URL pointing to a CSV file.'
      )
    }

    const transactionsIds = await fetchTransactionsFromCsv(args[0])

    const webhooks = await WebHookEvent.find({
      name: 'transaction_payables_created',
      model: 'transaction',
      model_id: { $in: transactionsIds }
    })
      .lean()
      .exec()

    if (!webhooks || webhooks.length <= 0) {
      Logger.warn({ transactionsIds }, 'webhooks-not-found')
      throw new Error('Webhooks not found')
    }

    for (const webhook of webhooks) {
      const transactionPayablesResponder = JSON.parse(webhook.payload)
      transactionPayablesResponder.transaction.status = 'refused'
      transactionPayablesResponder.payables.map(payable => {
        payable.status = 'suspended'
        return payable
      })
      // eslint-disable-next-line no-await-in-loop
      await sendWebHook(
        webhook.company_id,
        'transaction_refund_payables_created',
        webhook.model,
        webhook.model_id,
        'waiting_funds',
        'suspended',
        transactionPayablesResponder
      )
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
  return inputs.map(({ transactionId }) => transactionId)
}
