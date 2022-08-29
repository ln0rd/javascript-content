import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import Company from 'application/core/models/company'
import Transaction from 'application/core/models/transaction'
import config from 'application/core/config'
import { translate } from 'framework/core/adapters/i18n'
import request from 'axios'

const locale = frameworkConfig.core.i18n.defaultLocale

const Logger = createLogger({
  name: 'PAGS_WEBHOOK_SERVICE'
})

async function refundTransaction(transaction) {
  Logger.info({ transaction }, 'starting-transaction-refund')

  const dbTransaction = await getExistingTransaction(transaction.code)
  const company = await getCompany(dbTransaction.company_id)

  Logger.info(
    { transaction_id: dbTransaction._id, company_id: company._id },
    'found-transaction-and-company'
  )

  const payload = prepareQueuePayload(transaction, dbTransaction)

  Logger.info({ payload }, 'sending-to-queue')

  return sendToQueue(company, dbTransaction._id, payload)
}

function prepareQueuePayload(payloadTransaction) {
  return {
    amount: payloadTransaction.amount
  }
}

async function getExistingTransaction(providerTransactionId) {
  const transaction = await Transaction.findOne({
    provider_transaction_id: providerTransactionId
  })

  if (!transaction) {
    throw new ModelNotFoundError(
      locale,
      translate('models.transaction', locale)
    )
  }

  return transaction
}

function sendToQueue(company, transactionId, payload) {
  return request({
    method: 'post',
    baseURL: config.api_url,
    url: `/transactions/${transactionId}/register_refund`,
    headers: {
      'Content-Type': 'application/json'
    },
    auth: {
      username: 'hash_key',
      password: company.hash_key
    },
    data: payload
  })
}

async function getCompany(_id) {
  const company = await Company.findOne({ _id }, '_id hash_key')
    .lean()
    .exec()

  if (!company) {
    Logger.error({ company_id: _id }, 'no-company-found')

    const error = new ModelNotFoundError(
      locale,
      translate('models.company', locale)
    )

    error.context = { id: _id }

    throw error
  }

  return company
}

export { refundTransaction }
