import moment from 'moment-timezone'

import getUniqueId from 'application/core/helpers/unique-id'
import createLogger from 'framework/core/adapters/logger'

import Settlement from 'application/core/models/settlement'
import AccountingEvent from 'application/core/models/accounting-event'
import Company from 'application/core/models/company'

import { generateWalletSettlementEvent } from 'modules/accounting-events/domain/generate-wallet-settlement-event'
import { generateChargeEvents } from 'modules/accounting-events/domain/generate-charge-events'

const Logger = createLogger({ name: 'SETTLEMENT_ACCOUNTING_EVENTS' })

export async function generateAccountingEventsFromSettlement(settlementId) {
  const executionId = getUniqueId()
  const executionStartedAt = moment()
    .tz('America/Sao_Paulo')
    .format()
  const logContext = { settlementId, executionId, executionStartedAt }
  const Log = Logger.child(logContext)

  const settlement = await Settlement.findOne({ _id: settlementId })
    .lean()
    .exec()

  if (!settlement) {
    Log.error('cannot-find-settlement-to-generate-events-from')

    throw new Error(
      `Cannot find settlement #${settlementId} to generate Accounting Events from.`
    )
  }

  const company = await Company.findOne({ _id: settlement.company_id })
    .select({ parent_id: 1 })
    .lean()
    .exec()

  if (!company) {
    Log.error('cannot-find-company-to-generate-events-from')

    throw new Error(
      `Cannot find company #${
        settlement.company_id
      } to generate Accounting Events from.`
    )
  }

  const accountingEvents = []

  // Generating the Settlement event
  let settlementEvent
  try {
    settlementEvent = await generateWalletSettlementEvent(settlement, company)
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'LIQUIDACAO_WALLET' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  Log.info({ event: settlementEvent }, 'sucessfully-generated-settlement-event')

  accountingEvents.push(settlementEvent)

  // Charge events
  let chargeEvents
  try {
    chargeEvents = generateChargeEvents(settlement, company)
  } catch (err) {
    Log.error(
      { err, accountingEvent: 'CHARGE' },
      'failed-generating-accounting-event'
    )

    throw err
  }

  Log.info({ events: chargeEvents }, 'sucessfully-generated-charge-events')

  accountingEvents.push(chargeEvents)

  // Persisting the events on the database
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
