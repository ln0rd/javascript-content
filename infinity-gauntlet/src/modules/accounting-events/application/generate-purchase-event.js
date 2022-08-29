import moment from 'moment'
import assert from 'assert'

import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

/**
 * Generate the 'COMPRA' event, as described in MetaAccounting's Integration Specification
 * This event registers the gross amount of a transaction done by a merchant.
 *
 * @See {@link https://docs.google.com/document/d/1E6HOx8BX3LPg8kv6oFlkET5nWrbgVc-1m3VOI2SlW24/edit#}
 */
export async function generatePurchaseEvent(transaction) {
  assert(
    transaction.status === 'paid',
    "A Transaction must be in status 'paid' to generate the 'COMPRA' accounting event"
  )

  const purchaseEvent = new AccountingEvent({
    event_name: 'COMPRA',
    event_id: generateUuidV4(),
    status: 'unprocessed',
    originating_system: 'LEGACY_PAYABLES',
    originating_model: 'transaction',
    originating_model_id: transaction._id,
    iso_id: transaction.iso_id,
    merchant_id: transaction.company_id,
    amount_cents: transaction.amount,
    date: moment(transaction.captured_at)
  })

  return purchaseEvent
}
