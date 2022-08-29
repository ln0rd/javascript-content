export default {
  name: 'request_hardware_get_hardware',
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
