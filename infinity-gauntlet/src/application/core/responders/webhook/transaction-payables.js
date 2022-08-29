import { payableResponder } from 'application/core/responders/payable'
import { transactionResponder } from 'application/core/responders/transaction'

export function transactionPayablesResponder(payables, transaction) {
  return {
    object: 'transaction_payables',
    transaction: transactionResponder(transaction),
    payables: payableResponder(payables)
  }
}
