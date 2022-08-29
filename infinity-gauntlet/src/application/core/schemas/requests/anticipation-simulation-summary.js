export default {
  name: 'anticipation-simulation-summary',
  schema: {
    type: 'object',
    properties: {
      anticipate_to: {
        type: 'string',
        format: 'date'
      },
      payables_priority: {
        type: 'string',
        enum: ['start', 'end']
      }
    },
    required: ['anticipate_to', 'payables_priority']
  }
}
