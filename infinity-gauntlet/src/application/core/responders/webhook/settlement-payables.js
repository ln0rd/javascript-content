import { payablesSettlementResponder } from 'application/core/responders/payables-settlement'
import { settlementResponder } from 'application/core/responders/settlement'

export function settlementPayablesResponder(payables, settlement) {
  return {
    object: 'settlement_payables',
    settlement: settlementResponder(settlement),
    payables: payablesSettlementResponder(payables)
  }
}
