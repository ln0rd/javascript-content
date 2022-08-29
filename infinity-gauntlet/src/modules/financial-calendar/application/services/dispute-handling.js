import PayableRepository from 'modules/financial-calendar/infrastructure/repositories/payables'
import TransactionRepository from 'modules/financial-calendar/infrastructure/repositories/transaction'
import ChargebackHandlingService from 'modules/financial-calendar/application/services/chargeback-handling'

import AccountingEvent from 'application/core/models/accounting-event'

import { generateChargebackEvent } from 'modules/accounting-events/domain/generate-chargeback-event'

import { CHARGEDBACK, REFUNDED } from 'application/core/models/transaction'

import { createLogger } from '@hashlab/logger'

const Logger = createLogger({ name: 'DISPUTE_HANDLING_SERVICE' })

class DisputeHandlingService {
  constructor() {
    this.payableRepository = new PayableRepository()
    this.chargebackHandlingService = new ChargebackHandlingService()
    this.transactionRepository = new TransactionRepository()
  }

  /**
   * Handles a new Dispute, using the transaction data as a starting point.
   * It performs some sanity checks and then handles Chargeback when appropriate.
   *
   * @param dispute {Object} param A parameters object containing the dispute data.
   */
  async handle({ transaction_id }) {
    const transaction = await this.transactionRepository.findOne(
      { _id: transaction_id },
      'status _id company_id provider split_rules'
    )

    const statusesToSkip = [REFUNDED, CHARGEDBACK]

    if (statusesToSkip.includes(transaction.status)) {
      Logger.warn(
        { transactionId: transaction._id },
        'skipping-chargeback-payables-for-refunded-transaction'
      )

      return
    }

    const originalPayables = await this.payableRepository.findByTransactionId(
      transaction_id
    )
    try {
      await this.chargebackHandlingService.handleNewChargeback({
        payables: originalPayables,
        transaction
      })
    } catch (err) {
      Logger.error({ err }, 'failed-to-handle-chargeback')
      throw err
    }

    // Generate Accounting Events
    await disputeAccountingEvents(transaction)

    Logger.info(
      { transactionId: transaction_id },
      'dispute-handled-successfully'
    )
  }
}

async function disputeAccountingEvents(transaction) {
  let chargebackEvent
  try {
    chargebackEvent = await generateChargebackEvent(transaction)
  } catch (err) {
    Logger.error({ err }, 'failed-generating-chargeback-accounting-event')
  }

  if (chargebackEvent) {
    try {
      await AccountingEvent.create(chargebackEvent)

      Logger.info(
        { transactionId: transaction._id },
        'succesfully-inserted-chargeback-accounting-events'
      )
    } catch (err) {
      Logger.error(
        { err, chargebackEvent },
        'failed-to-batch-insert-accounting-events'
      )
    }
  }
}

export default DisputeHandlingService
