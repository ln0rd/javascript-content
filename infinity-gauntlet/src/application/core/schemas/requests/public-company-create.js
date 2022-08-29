export default {
  name: 'request_public_company_create',
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
