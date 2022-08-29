import { mapModel } from 'application/core/helpers/responder'

export function eventSourceResponder(model) {
  return mapModel(model, eventSource => {
    return {
      object: 'event_source',
      id: eventSource._id,
      name: eventSource.name,
      description: eventSource.description || '',
      enabled: eventSource.enabled,
      label: eventSource.label
    }
  })
}
