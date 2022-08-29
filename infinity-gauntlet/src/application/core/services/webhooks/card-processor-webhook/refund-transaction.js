import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import TransactionService from 'application/core/services/transaction'
import Transaction from 'application/core/models/transaction'
import { translate } from 'framework/core/adapters/i18n'

const locale = frameworkConfig.core.i18n.defaultLocale
const operation = 'register-refund-from-card-processor'

const Logger = createLogger({
  name: 'CARD_PROCESSOR_WEBHOOK_SERVICE'
})

async function refundTransaction(hammerData, transactionData) {
  Logger.info({ hammerData }, 'starting-transaction-refund')

  const originalTransaction = await Transaction.findOne({
    provider_transaction_id: hammerData.original_transaction_id
  })
    .select('_id')
    .lean()
    .exec()

  if (!originalTransaction || !originalTransaction._id) {
    Logger.error(
      {
        hammerData
      },
      `${operation}-refund-original-trx-not-found`
    )

    throw new ModelNotFoundError(
      locale,
      translate('models.transaction', locale)
    )
  }

  return TransactionService.registerRefund(
    locale,
    originalTransaction._id.toString(),
    transactionData,
    transactionData.company_id
  )
}

export { refundTransaction }
