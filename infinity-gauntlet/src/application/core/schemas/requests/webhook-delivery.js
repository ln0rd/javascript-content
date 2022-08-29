export default {
  name: 'request_webhook_delivery',
  schema: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        format: 'object_id'
      },
      id: {
        type: 'string',
        format: 'object_id'
      }
    },
    required: ['event_id', 'id']
  }
}
