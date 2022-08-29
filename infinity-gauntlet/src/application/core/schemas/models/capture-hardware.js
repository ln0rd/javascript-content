export default {
  name: 'capture_hardware',
  schema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string'
      },
      software_provider: {
        type: 'string',
        enum: ['none', 'celer', 'hash_capture']
      },
      terminal_type: {
        type: 'string'
      },
      terminal_model: {
        type: 'string',
        enum: [
          'vx685',
          'vx680',
          'd180',
          'd150',
          'mobipin10',
          'vx690',
          'iwl280',
          'move5000',
          'gpos400',
          'mp20',
          'ict250',
          'c680',
          'a920',
          's920',
          'd195',
          'd190',
          'd175'
        ]
      },
      serial_number: {
        type: 'string'
      }
    },
    required: [
      'provider',
      'software_provider',
      'terminal_type',
      'terminal_model',
      'serial_number'
    ]
  }
}
