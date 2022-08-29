export default {
  name: 'request_transaction_simulation',
  schema: {
    type: 'object',
    properties: {
      anticipation_type: {
        type: 'string',
        enum: ['per_month'],
        default: 'per_month'
      },
      amount: {
        type: 'integer',
        minimum: 1
      },
      max_installments: {
        type: 'integer',
        minimum: 1,
        maximum: 12
      },
      anticipation_days_interval: {
        type: 'integer',
        minimum: 1
      },
      card_brand: {
        type: 'string',
        enum: ['visa', 'mastercard', 'elo', 'hiper']
      }
    },
    required: ['amount']
  }
}
