import moment from 'moment'
import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

export async function generateIsoRevenueEvent(transaction, payables) {
  const isoRevenue = payables.reduce(
    (total, payable) => total + (payable.mdr_fee || 0),
    0
  )

  const purchaseEvent = new AccountingEvent({
    event_name: 'REMUNERACAO_ISO',
    event_id: generateUuidV4(),
    status: 'unprocessed',
    originating_system: 'LEGACY_PAYABLES',
    originating_model: 'transaction',
    originating_model_id: transaction._id,
    iso_id: transaction.iso_id,
    merchant_id: transaction.company_id,
    amount_cents: isoRevenue,
    date: moment(transaction.captured_at)
  })

  return purchaseEvent
}
