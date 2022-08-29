export default {
  name: 'request_user_send_password_reset_link',
  schema: {
    type: 'object',
    properties: {
      email: {
        type: 'string'
      }
    },
    required: ['email']
  }
}
