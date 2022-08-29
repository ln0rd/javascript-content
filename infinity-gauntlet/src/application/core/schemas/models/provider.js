export default {
  name: 'provider',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      key: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      },
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      },
      ec_number: {
        type: 'string'
      }
    },
    required: ['name', 'key', 'enabled']
  }
}
