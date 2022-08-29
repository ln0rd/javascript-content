export default {
  name: 'request_webhook_deliveries',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'object_id'
      },
      page: {
        type: 'integer'
      },
      count: {
        type: 'integer'
      }
    },
    required: ['id']
  }
}
