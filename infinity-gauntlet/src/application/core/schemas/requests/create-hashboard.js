export default {
  name: 'request_create_hashboard',
  schema: {
    type: 'object',
    properties: {
      company: {
        type: 'string'
      }
    },
    required: ['company']
  }
}
