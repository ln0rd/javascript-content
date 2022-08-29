export default {
  name: 'integration_credential',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      key: {
        type: 'string'
      },
      username: {
        type: 'string'
      },
      password: {
        type: 'string'
      }
    },
    required: ['name']
  }
}
