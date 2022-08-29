import { payableResponder } from 'application/core/responders/payable'
import { transactionResponder } from 'application/core/responders/transaction'

export function refundPayablesResponder(
  payables,
  originalPayables,
  transaction
) {
  return {
    object: 'transaction_payables',
    transaction: transactionResponder(transaction),
    payables: payableResponder(payables),
    originalPayables: payableResponder(originalPayables)
  }
}
