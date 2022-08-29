import { generateAccountingEventsFromTransaction } from 'modules/accounting-events/application/generate-accounting-events-from-transaction'

export default class AccountingEventsNewTransaction {
  static type() {
    return 'triggered'
  }

  static async handler(msg) {
    const parsedMsg = JSON.parse(msg)

    if (!('transaction_id' in parsedMsg)) {
      throw new Error("Invalid payload. 'transaction_id' must be present.")
    }

    return generateAccountingEventsFromTransaction(parsedMsg.transaction_id)
  }
}
