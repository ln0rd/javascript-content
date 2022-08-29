import moment from 'moment'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import Hardware from 'application/core/models/capture-hardware'
import TransactionService from 'application/core/services/transaction'
import { translate } from 'framework/core/adapters/i18n'

import {
  toHashPaymentMethod,
  toHashStatus,
  toHashCardBrand
} from 'application/core/providers/acquirers/pags/translator'

const Logger = createLogger({
  name: 'PAGS_WEBHOOK_SERVICE'
})

async function registerTransaction(transaction) {
  Logger.info({ transaction }, 'starting-transaction-registration')

  const hardware = await getHardware(
    transaction.deviceInfo.serialNumber,
    transaction.date
  )

  Logger.info(
    { hardware_id: hardware._id, company_id: hardware.company_id },
    'found-hardware-and-company'
  )

  const payload = prepareQueuePayload(transaction)

  Logger.info({ payload }, 'sending-to-queue')

  return sendToQueue(hardware.company_id, payload)
}

async function getHardware(serial, capturedDate) {
  const hardware = await Hardware.findOne({
    serial_number: {
      $in: [serial.toUpperCase(), serial.toLowerCase()]
    },
    created_at: { $lte: moment(capturedDate).toDate() }
  })
    .sort({ created_at: 'desc' })
    .lean()
    .exec()

  Logger.info({ hardware, captureDate: capturedDate }, 'list-of-hardware-found')

  if (!hardware) {
    Logger.error({ serial }, 'no-hardware-found')
    const error = new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.hardware', frameworkConfig.core.i18n.defaultLocale)
    )

    error.context = { serial }

    throw error
  }

  return hardware
}

function prepareQueuePayload(transaction) {
  const payment_method = toHashPaymentMethod(transaction.paymentMethod.type)

  const status = toHashStatus(transaction.status)
  const cardBrand = toHashCardBrand(transaction.paymentMethod.code)

  return {
    transaction_id: transaction.code,
    provider: 'hash',
    acquirer_name: 'pags',
    acquirer_created_at: transaction.date,
    captured_at: transaction.date,
    amount: Math.round(Number(transaction.grossAmount) * 100),
    serial_number: transaction.deviceInfo.serialNumber,
    installments: Number(transaction.installmentCount),
    card_brand: cardBrand,
    card_first_digits: transaction.deviceInfo.bin,
    card_last_digits: transaction.deviceInfo.holder,
    acquirer_account_id: transaction.acquirer_account_id,
    payment_method,
    status
  }
}

function sendToQueue(companyId, formatedBody) {
  return TransactionService.queueRegister(
    frameworkConfig.core.i18n.defaultLocale,
    formatedBody,
    companyId
  )
}

export { registerTransaction }
