export default {
  name: 'request_event_source',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      label: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      }
    },
    required: ['name', 'enabled']
  }
}
