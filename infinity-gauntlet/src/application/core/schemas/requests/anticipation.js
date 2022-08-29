export default {
  name: 'anticipation',
  schema: {
    type: 'object',
    properties: {
      requested_amount: {
        type: 'integer',
        minimum: 1
      },
      anticipate_to: {
        type: 'string',
        format: 'date'
      },
      payables_priority: {
        type: 'string',
        enum: ['start', 'end']
      },
      anticipate_all: {
        type: 'boolean'
      },
      anticipation_fee: {
        type: 'number',
        minimum: 0
      },
      anticipation_type: {
        type: 'string',
        enum: ['per_month', 'per_installment']
      }
    },
    oneOf: [
      { required: ['requested_amount', 'anticipate_to', 'payables_priority'] },
      {
        required: ['anticipate_all', 'anticipate_to', 'payables_priority'],
        properties: {
          anticipate_all: {
            type: 'boolean',
            enum: [true]
          }
        }
      }
    ]
  }
}
