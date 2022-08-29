export default {
  name: 'request_create_api_key',
  schema: {
    type: 'object',
    properties: {
      permissions: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      name: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      }
    },
    required: ['permissions', 'name']
  }
}
