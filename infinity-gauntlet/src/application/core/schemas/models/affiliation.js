export default {
  name: 'affiliation',
  schema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string'
      },
      internal_provider: {
        type: 'string'
      },
      key: {
        type: 'string'
      },
      enabled: {
        type: 'boolean'
      },
      merchant_id: {
        type: 'string'
      },
      security_key: {
        type: 'string'
      }
    },
    required: ['provider', 'internal_provider']
  }
}
