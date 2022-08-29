export default {
  name: 'request_user_reset_password',
  schema: {
    type: 'object',
    properties: {
      email: {
        type: 'string'
      },
      document_number: {
        type: 'string'
      },
      recovery_method: {
        type: 'string',
        enum: ['sms', 'email']
      }
    },
    anyOf: [
      { required: ['document_number', 'recovery_method'] },
      { required: ['email', 'recovery_method'] },
      { required: ['document_number', 'email', 'recovery_method'] }
    ]
  }
}
