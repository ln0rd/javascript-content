export default {
  name: 'request_settlement_get_settlement',
  schema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'object_id'
      }
    },
    required: ['id']
  }
}
