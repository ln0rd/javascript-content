import moment from 'moment'
import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

export async function generateMerchantSplitEvents(transaction, payables) {
  const participatingCompanyIds = [...new Set(payables.map(p => p.company_id))]

  // we treat ISO's payables differently so they don't count as splits
  const merchantIds = participatingCompanyIds.filter(
    companyId => companyId !== transaction.iso_id
  )

  const splitEvents = []

  for (const merchant of merchantIds) {
    const merchantPayables = payables.filter(p => p.company_id === merchant)

    const netAmount = merchantPayables.reduce(
      (total, payable) => total + (payable.amount - payable.cost - payable.fee),
      0
    )

    const splitEvent = new AccountingEvent({
      event_name: 'SPLIT_MERCHANT',
      event_id: generateUuidV4(),
      status: 'unprocessed',
      merchant_id: merchant, // pointing to this merchant instead of the transaction's originator
      amount_cents: netAmount,
      iso_id: transaction.iso_id,
      originating_system: 'LEGACY_PAYABLES',
      originating_model: 'transaction',
      originating_model_id: transaction._id,
      date: moment(transaction.captured_at)
    })

    splitEvents.push(splitEvent)
  }

  return splitEvents
}
