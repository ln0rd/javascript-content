export default {
  name: 'register_company_event',
  schema: {
    type: 'object',
    properties: {
      event_handler: {
        type: 'string'
      },
      event_source: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      },
      inheritable: {
        type: 'boolean'
      },
      priority: {
        type: 'integer',
        minimum: -19,
        maximum: 20
      }
    },
    required: ['event_source', 'event_handler']
  }
}
