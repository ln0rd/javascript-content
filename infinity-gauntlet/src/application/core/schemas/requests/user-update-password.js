export default {
  name: 'request_user_update_password',
  schema: {
    type: 'object',
    properties: {
      current_password: {
        type: 'string'
      },
      new_password: {
        type: 'string',
        format: 'password_policy'
      }
    },
    required: ['current_password', 'new_password']
  }
}
