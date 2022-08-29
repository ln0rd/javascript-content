export default {
  name: 'request_migrate_company',
  schema: {
    type: 'object',
    properties: {
      password: {
        type: 'string'
      },
      current_password: {
        type: 'string'
      }
    },
    required: ['password', 'current_password']
  }
}
