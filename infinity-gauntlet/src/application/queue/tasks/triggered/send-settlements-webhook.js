import moment from 'moment'
import createLogger from 'framework/core/adapters/logger'
import ManualSendSettlementWebhook from 'application/queue/tasks/manual/manual-send-settlement-webhook'

const Logger = createLogger({ name: 'SEND_SETTLEMENTS_WEBHOOK' })

export default class SendSettlementsWebhook {
  static type() {
    return 'triggered'
  }

  static async handler() {
    try {
      await ManualSendSettlementWebhook.handler([moment().format('YYYY-MM-DD')])
    } catch (err) {
      Logger.error({ err }, 'error-sending-settlements-webhook')
    }
  }
}
