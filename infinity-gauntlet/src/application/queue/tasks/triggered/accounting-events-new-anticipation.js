import createLogger from 'framework/core/adapters/logger'
import { generateAccountingEventsFromAnticipation } from 'modules/accounting-events/application/generate-accounting-events-from-anticipation'

const Logger = createLogger({ name: 'ACCOUNTING_EVENTS_NEW_ANTICIPATION' })

export default class AccountingEventsNewAnticipation {
  static type() {
    return 'triggered'
  }

  static async handler(msg) {
    const parsedMsg = JSON.parse(msg)
    if (!('anticipationId' in parsedMsg)) {
      Logger.error({ parsedMsg }, 'no-anticipation-id')
      return
    }
    return generateAccountingEventsFromAnticipation(parsedMsg.anticipationId)
  }
}
