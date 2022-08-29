export default {
  name: 'request_user_invite',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      email: {
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
