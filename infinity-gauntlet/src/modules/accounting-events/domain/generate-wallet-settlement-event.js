import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

export function generateWalletSettlementEvent(settlement, company) {
  const isoId = company.parent_id || settlement.company_id

  const eventName =
    settlement.amount < 0 ? 'REVERSAO_LIQUIDACAO_WALLET' : 'LIQUIDACAO_WALLET'

  const settlementEvent = new AccountingEvent({
    event_name: eventName,
    event_id: generateUuidV4(),
    status: 'unprocessed',
    originating_system: 'LEGACY_SETTLEMENT',
    originating_model: 'settlement',
    originating_model_id: settlement._id,
    iso_id: isoId,
    merchant_id: settlement.company_id,
    amount_cents: Math.abs(settlement.amount),
    date: settlement.created_at
  })

  return settlementEvent
}
