export default {
  name: 'request_user_activate',
  schema: {
    type: 'object',
    properties: {
      token: {
        type: 'string'
      },
      password: {
        type: 'string',
        format: 'password_policy'
      }
    },
    required: ['token', 'password']
  }
}
