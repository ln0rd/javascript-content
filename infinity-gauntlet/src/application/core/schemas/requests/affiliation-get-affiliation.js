export default {
  name: 'request_affiliation_get_affiliation',
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
