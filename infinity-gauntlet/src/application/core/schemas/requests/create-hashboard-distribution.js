export default {
  name: 'request_create_hashboard_distribution',
  schema: {
    type: 'object',
    properties: {
      provider_id: {
        type: 'string'
      },
      provider: {
        type: 'string'
      },
      status: {
        type: 'string'
      }
    },
    required: ['provider_id', 'provider', 'status']
  }
}
