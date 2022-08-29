import * as cardBrands from 'application/core/domain/card-brands'

export default {
  name: 'request_transaction_calculation',
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
      installments: {
        type: 'integer',
        minimum: 1,
        maximum: 18
      },
      anticipation_days_interval: {
        type: 'integer',
        minimum: 1
      },
      brand: {
        type: 'string',
        enum: cardBrands.names()
      },
      split_as_credit: {
        type: 'boolean'
      }
    },
    required: ['amount', 'brand']
  }
}
