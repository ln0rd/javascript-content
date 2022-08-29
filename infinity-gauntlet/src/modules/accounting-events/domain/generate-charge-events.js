import { generateUuidV4 } from 'application/core/helpers/uuid'
import AccountingEvent from 'application/core/models/accounting-event'

export function generateChargeEvents(settlement, company) {
  const isoId = company.parent_id || settlement.company_id

  const outgoingCharges = settlement.charges || []
  const receivedCharges = settlement.received_charges || []

  const outgoingChargeEvents = outgoingCharges.map(charge =>
    generateChargeEvent(charge, isoId, 'DEBITO_CHARGE', settlement.created_at)
  )

  const receivedChargeEvents = receivedCharges.map(charge =>
    generateChargeEvent(charge, isoId, 'CREDITO_CHARGE', settlement.created_at)
  )

  const chargeEvents = [...outgoingChargeEvents, ...receivedChargeEvents]

  return chargeEvents
}

export function generateChargeEvent(charge, isoId, eventName, createdAt) {
  const settlementEvent = new AccountingEvent({
    event_name: eventName,
    event_id: generateUuidV4(),
    status: 'unprocessed',
    originating_system: 'LEGACY_CHARGES',
    originating_model: 'charge',
    originating_model_id: charge.id,
    iso_id: isoId,
    merchant_id: charge.company_id,
    amount_cents: Math.abs(charge.amount),
    date: createdAt
  })

  return settlementEvent
}
