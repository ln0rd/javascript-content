export default {
  name: 'user',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      email: {
        type: 'string'
      },
      document_number: {
        type: 'string'
      },
      permission: {
        type: 'string'
      },
      phone_number: {
        type: 'string'
      },
      user_metadata: {
        type: 'object'
      }
    },
    required: ['email']
  }
}
