import { payableResponder } from 'application/core/responders/payable'
import { anticipationResponder } from 'application/core/responders/anticipation'

export function anticipationPayablesResponder(anticipation, payables) {
  return {
    object: 'anticipation_payables',
    anticipation: anticipationResponder(anticipation, false),
    payables: payables.map(payable => payableResponder(payable))
  }
}
