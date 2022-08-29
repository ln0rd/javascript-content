import { handlerTypes } from 'application/core/models/event-handler'

export default {
  name: 'update_event_handler',
  schema: {
    type: 'object',
    properties: {
      handler_type: {
        type: 'string',
        enum: handlerTypes
      },
      label: {
        type: 'string'
      },
      name: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      },
      handler: {
        type: 'string'
      },
      version_configuration: {
        type: 'object',
        properties: {
          handler_version: {
            type: 'string'
          },
          version_match: {
            type: 'string',
            enum: ['exact', 'minimum', 'not']
          }
        }
      }
    }
  }
}
