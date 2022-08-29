export default {
  name: 'mcc',
  schema: {
    type: 'object',
    properties: {
      mcc: {
        type: 'string',
        required: true
      },
      provider: {
        type: 'string',
        required: true
      },
      hash_markup: {
        type: 'number'
      },
      anticipation_cost: {
        type: 'number'
      },
      minimum_anticipation_fee: {
        type: 'number'
      },
      minimum_brands_fee: {
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
            cost: {
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
    required: ['mcc', 'provider']
  }
}
