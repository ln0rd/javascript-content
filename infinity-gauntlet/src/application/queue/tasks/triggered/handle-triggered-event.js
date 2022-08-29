import createLogger from 'framework/core/adapters/logger'
import HandleTriggeredEventManual from 'application/queue/tasks/manual/handle-triggered-event'

const Logger = createLogger({ name: 'HANDLE_TRIGGERED_EVENT' })

export default class HandleTriggeredEvent {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    const message = JSON.parse(msg)
    const eventId = message.event_id

    Logger.info(
      {
        triggered_event_id: eventId
      },
      'triggered-handle-triggered-event'
    )

    return HandleTriggeredEventManual.handler([eventId])
  }
}
