export default {
  name: 'request_create_hashboard_deployment',
  schema: {
    type: 'object',
    properties: {
      environment: {
        type: 'string'
      }
    },
    required: ['environment']
  }
}
