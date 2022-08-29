import { mapModel } from 'application/core/helpers/responder'

export function companyEventResponder(model) {
  return mapModel(model, registeredEvent => {
    return {
      object: 'company_registered_event',
      id: registeredEvent._id,
      event_handler: registeredEvent.event_handler,
      event_source: registeredEvent.event_source,
      enabled: registeredEvent.enabled,
      inheritable: registeredEvent.inheritable,
      priority: registeredEvent.priority
    }
  })
}
