import * as ChargebackDebitPayable from 'modules/financial-calendar/domain/chargeback-debit-payable'
import { PROPORTIONAL_TO_SPLIT } from 'modules/financial-calendar/domain/chargeback-handling'

function chargebackResponsibilityProportionalToSplit({ payables }) {
  const newPayables = payables
    .filter(payable => payable.type === 'credit')
    .map(payable => ChargebackDebitPayable.fromCreditPayable(payable))

  return newPayables
}

/**
 * Checks if this chargeback handling policy is applicable to the current transaction.
 * @param {String} policy
 * @returns {Boolean}
 */
function isApplicable(policy) {
  return PROPORTIONAL_TO_SPLIT === policy
}

function getFuturePayablesIdsToAdvance({ payables }) {
  return payables
    .filter(({ status }) => status !== 'paid')
    .map(({ _id }) => _id)
}

export {
  chargebackResponsibilityProportionalToSplit as apply,
  isApplicable,
  getFuturePayablesIdsToAdvance
}
