export default {
  name: 'request_charge_configuration_get_charge_configuration',
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
