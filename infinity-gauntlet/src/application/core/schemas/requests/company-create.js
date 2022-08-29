export default {
  name: 'request_company_create',
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
