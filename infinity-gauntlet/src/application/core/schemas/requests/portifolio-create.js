export default {
  name: 'request_portifolio_create',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      owner_id: {
        type: 'string'
      },
      merchant_ids: [{ type: 'string' }],
      viewers: [{ type: 'string' }]
    },
    required: ['name']
  }
}
