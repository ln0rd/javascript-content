import { mapModel } from 'application/core/helpers/responder'

export function eventHandlerResponder(model) {
  return mapModel(model, eventHandler => {
    const handler = {
      object: 'event_handler',
      id: eventHandler._id,
      name: eventHandler.name,
      enabled: eventHandler.enabled,
      handler_type: eventHandler.handler_type,
      handler: eventHandler.handler
    }

    if (eventHandler.version_configuration) {
      handler.version_configuration = {
        handler_version: eventHandler.version_configuration.handler_version,
        version_match: eventHandler.version_configuration.version_match
      }
    }

    return handler
  })
}
