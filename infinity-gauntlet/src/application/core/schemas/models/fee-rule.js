export default {
  name: 'fee_rule',
  schema: {
    type: 'object',
    properties: {
      anticipation_fee: {
        type: 'number'
      },
      anticipation_type: {
        type: 'string',
        enum: ['per_month', 'per_installment', 'per_additional_installment']
      },
      enabled: {
        type: 'boolean'
      },
      brands: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            brand: {
              type: 'string',
              required: true
            },
            fee: {
              type: 'object',
              properties: {
                debit: {
                  type: 'number'
                },
                credit_1: {
                  type: 'number'
                },
                credit_2: {
                  type: 'number'
                },
                credit_7: {
                  type: 'number'
                }
              },
              required: ['debit', 'credit_1', 'credit_2', 'credit_7']
            }
          },
          required: ['brand']
        }
      }
    },
    required: []
  }
}
