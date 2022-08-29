import assert from 'assert'

import { generateUuidV4 } from 'application/core/helpers/uuid'

import { CHARGEDBACK } from 'application/core/models/transaction'

import AccountingEvent from 'application/core/models/accounting-event'

/**
 * Generate the 'CHARGEBACK' event, as described in MetaAccounting's Integration Specification
 * This event registers the gross amount of a transaction done by a merchant.
 *
 * @See {@link https://docs.google.com/document/d/1E6HOx8BX3LPg8kv6oFlkET5nWrbgVc-1m3VOI2SlW24/edit#}
 */
export async function generateChargebackEvent(transaction) {
  assert(
    transaction.status === CHARGEDBACK,
    "A Transaction must be in status 'chargedback' to generate the 'CHARGEBACK' accounting event"
  )

  const chargebackEvent = new AccountingEvent({
    event_name: 'CHARGEBACK',
    event_id: generateUuidV4(),
    status: 'unprocessed',
    originating_system: 'LEGACY_CHARGEBACK',
    originating_model: 'transaction',
    originating_model_id: transaction._id,
    iso_id: transaction.iso_id,
    merchant_id: transaction.company_id,
    amount_cents: transaction.amount,
    date: new Date()
  })

  return chargebackEvent
}
