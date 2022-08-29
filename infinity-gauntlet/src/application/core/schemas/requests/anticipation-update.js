export default {
  name: 'request_anticipation_update',
  schema: {
    type: 'object',
    properties: {
      anticipation_type: {
        type: 'string',
        enum: ['spot', 'automatic']
      },
      anticipation_days_interval: {
        type: 'number',
        minimum: 1,
        maximum: 30
      }
    },
    required: ['anticipation_type']
  }
}
