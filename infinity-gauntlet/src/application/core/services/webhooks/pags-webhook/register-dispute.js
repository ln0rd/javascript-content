import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { translate } from 'framework/core/adapters/i18n'
import { publishMessage } from 'framework/core/adapters/queue'

import Transaction from 'application/core/models/transaction'

const locale = frameworkConfig.core.i18n.defaultLocale

const Logger = createLogger({
  name: 'PAGS_WEBHOOK_SERVICE'
})

async function registerDispute(transaction) {
  Logger.info({ transaction }, 'starting-transaction-dispute')

  const { _id: transaction_id } = await getExistingTransaction(transaction.code)

  Logger.info({ transaction_id }, 'found-transaction')

  const payload = { transaction_id }

  Logger.info({ payload }, 'sending-to-queue')

  return sendToQueue(payload)
}

async function getExistingTransaction(providerTransactionId) {
  const transaction = await Transaction.findOne(
    {
      provider_transaction_id: providerTransactionId
    },
    '_id'
  )

  if (!transaction) {
    throw new ModelNotFoundError(
      locale,
      translate('models.transaction', locale)
    )
  }

  return transaction
}

function sendToQueue(body) {
  return publishMessage(
    'RegisterDispute',
    Buffer.from(JSON.stringify(body))
  ).catch(err => {
    Logger.error({ err, formatedBody: body }, 'failed-to-enqueue-dispute')
    throw err
  })
}

export { registerDispute }
