import { generateAccountingEventsFromSettlement } from 'modules/accounting-events/application/generate-accounting-events-from-settlement'

export default class AccountingEventsNewSettlement {
  static type() {
    return 'triggered'
  }

  static async handler(msg) {
    const parsedMsg = JSON.parse(msg)

    if (!('settlement_id' in parsedMsg)) {
      throw new Error("Invalid payload. 'settlement_id' must be present.")
    }

    return generateAccountingEventsFromSettlement(parsedMsg.settlement_id)
  }
}
