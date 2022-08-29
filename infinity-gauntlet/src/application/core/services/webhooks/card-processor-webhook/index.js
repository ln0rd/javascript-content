import createLogger from 'framework/core/adapters/logger'
import assert from 'assert'
import config from 'application/core/config'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'
import TransactionService from 'application/core/services/transaction'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import frameworkConfig from 'framework/core/config'
import * as TransactionHelper from 'application/core/helpers/transaction'
import { refundTransaction } from './refund-transaction'

const cardProcessorConfig = config.providers.capture_softwares.card_processor
const locale = frameworkConfig.core.i18n.defaultLocale

const Logger = createLogger({
  name: 'CARD_PROCESSOR_WEBHOOK_SERVICE'
})

export default class CardProcessorWebhookService {
  constructor() {
    assert(
      cardProcessorConfig.token,
      'Required CARD_PROCESSOR_TOKEN environment variable not found'
    )
  }

  isApplicable(req) {
    const tokenMatch =
      req.body &&
      req.body.secrettoken &&
      req.body.secrettoken === cardProcessorConfig.token

    return tokenMatch
  }

  async handle(req) {
    Logger.info({ body: req.body }, 'handling-card-processor-webhook')

    const body = req.body
    const operation = 'register-trx-from-card-processor'
    const validationErrors = validate('json_event_format', body)

    if (validationErrors) {
      Logger.error(
        {
          validationErrors,
          body
        },
        `${operation}-validation-error`
      )

      throw new ValidationError(locale, validationErrors)
    }

    if (body.secrettoken !== cardProcessorConfig.token) {
      Logger.error(
        {
          validationErrors,
          body
        },
        `${operation}-token-mismatch`
      )

      throw new UnauthorizedError(locale, 'card_processor_token')
    }

    const { hammerData, transactionData } = TransactionHelper.parseHammerData(
      body.data_base64
    )

    transactionData.captured_by_hash = true

    // Persistent information, transaction acquired by Hash Network
    // Data field is not acquired_by to avoid misunderstanding with acquirer_name.
    transactionData.captured_by = 'hash'

    if (hammerData.operation === 'refund') {
      return refundTransaction(hammerData, transactionData)
    }

    return TransactionService.queueRegister(
      locale,
      transactionData,
      transactionData.company_id
    )
  }
}
