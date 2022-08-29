import { mapModel } from 'application/core/helpers/responder'

export function triggeredEventResponder(model) {
  return mapModel(model, triggeredEvent => {
    return {
      object: 'triggered_event',
      id: triggeredEvent._id,
      event_source: triggeredEvent.event_source,
      event_handler: triggeredEvent.event_handler,
      status: triggeredEvent.status,
      status_history: triggeredEvent.status_history,
      triggered_company: triggeredEvent.triggered_company,
      retry_attempts: triggeredEvent.retry_attempts,
      args: triggeredEvent.args,
      handler_version: triggeredEvent.handler_version
    }
  })
}
