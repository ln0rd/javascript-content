export default {
  name: 'request_activate_serial',
  schema: {
    type: 'object',
    properties: {
      serial_number: {
        type: 'string'
      }
    },
    required: ['serial_number']
  }
}
