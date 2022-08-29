export default {
  name: 'request_password_reset_token',
  schema: {
    type: 'object',
    properties: {
      email: {
        type: 'string'
      },
      document_number: {
        type: 'string'
      },
      target: {
        type: 'string'
      },
      recovery_method: {
        type: 'string',
        enum: ['sms', 'email']
      }
    },
    anyOf: [
      { required: ['document_number', 'recovery_method', 'target'] },
      { required: ['email', 'recovery_method', 'target'] },
      { required: ['document_number', 'email', 'recovery_method', 'target'] }
    ]
  }
}
