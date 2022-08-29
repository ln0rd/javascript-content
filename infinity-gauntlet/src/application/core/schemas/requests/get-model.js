export default {
  name: 'request_get_model',
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
