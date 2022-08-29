export default {
  name: 'update_company_event',
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
      priority: {
        type: 'integer',
        minimum: -19,
        maximum: 20
      }
    }
  }
}
