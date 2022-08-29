import moment from 'moment-timezone'

import getUniqueId from 'application/core/helpers/unique-id'
import createLogger from 'framework/core/adapters/logger'

import Transaction from 'application/core/models/transaction'
import Payable from 'application/core/models/payable'
import AccountingEvent from 'application/core/models/accounting-event'

import { generatePurchaseEvent } from './generate-purchase-event'
import { generateHashRevenueEvent } from '../domain/generate-hash-revenue-event'
import { generateIsoRevenueEvent } from '../domain/generate-iso-revenue-event'
import { generateMerchantSplitEvents } from '../domain/generate-merchant-split-events'

const Logger = createLogger({ name: 'ACCOUNTING_EVENTS' })

/**
 * This is the entrypoint for the generation of Payables and Transaction related Accounting Events.
 * It is executed after being triggered by a queue message, and will ultimately generate and
 * insert the following events:
 *  - COMPRA
 *  - REMUNERACAO_ISO
 *  - REMUNERACAO_HASH
 *  - SPLIT_MERCHANT
 *  - SPLIT_ISO
 *
 * This events will then be sent to MetaAccounting by a separate application, outside IG.
 *
 * @See {@link https://docs.google.com/document/d/1E6HOx8BX3LPg8kv6oFlkET5nWrbgVc-1m3VOI2SlW24/edit#}
 *
 * @param {Number} transactionId The current transaction's ID
 */
async function generateAccountingEventsFromTransaction(transactionId) {
  const executionID = getUniqueId()
  const executionStartedAt = moment()
    .tz('America/Sao_Paulo')
    .format()
  const logContext = { transactionId, executionID, executionStartedAt }
  const Log = Logger.child(logContext)

  const accountingEvents = []

  const transaction = await Transaction.findById(transactionId)
  const payables = await Payable.find({ transaction_id: transactionId })

  if (!transaction) {
    Log.error('cannot-find-transaction-to-generate-events-from')

    throw new Error(
      `Cannot find transaction #${transactionId} to generate Accounting Events from.`
    )
  }

  if (!payables || !payables.length) {
    Log.error('cannot-find-payables-to-generate-events-from')

    throw new Error(
      `Cannot find Payables for transaction #${transactionId} to generate Accounting Events from.`
    )
  }

  let purchaseEvent

  try {
    purchaseEvent = await generatePurchaseEvent(transaction)
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'COMPRA' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  Log.info({ event: purchaseEvent }, 'sucessfully-generated-purchase-event')

  accountingEvents.push(purchaseEvent)

  let hashRevenueEvent

  try {
    hashRevenueEvent = await generateHashRevenueEvent(transaction, payables)
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'REMUNERACAO_HASH' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  Log.info(
    { event: hashRevenueEvent },
    'sucessfully-generated-hash-revenue-event'
  )

  accountingEvents.push(hashRevenueEvent)

  let isoRevenueEvent

  try {
    isoRevenueEvent = await generateIsoRevenueEvent(transaction, payables)
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'REMUNERACAO_ISO' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  Log.info(
    { event: isoRevenueEvent },
    'sucessfully-generated-iso-revenue-event'
  )

  accountingEvents.push(isoRevenueEvent)

  // TODO: add the rest of the accounting events

  let merchantSplitEvents = []

  try {
    merchantSplitEvents = await generateMerchantSplitEvents(
      transaction,
      payables
    )
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'SPLIT_MERCHANT' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  accountingEvents.push(...merchantSplitEvents)

  let insertedEvents
  try {
    insertedEvents = await AccountingEvent.insertMany(accountingEvents)
  } catch (err) {
    Log.error(
      { err, accountingEvents },
      'failed-to-batch-insert-accounting-events'
    )

    // TODO: Setup alerts / notifications for manual work
    throw err
  }

  const executionFinishedAt = moment()
    .tz('America/Sao_Paulo')
    .format()

  Log.info(
    { insertedEvents, executionFinishedAt },
    'successfully-batch-inserted-accounting-events'
  )
}

export { generateAccountingEventsFromTransaction }
