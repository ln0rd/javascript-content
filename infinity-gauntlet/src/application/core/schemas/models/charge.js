export default {
  name: 'charge',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        minimum: 1
      },
      provider: {
        type: 'string',
        enum: ['stone', 'guichevirtual', 'hash']
      },
      charge_method: {
        type: 'string',
        enum: ['balance_debit']
      },
      charge_date: {
        type: 'string'
      },
      interval: {
        type: 'string'
      },
      destination_company_id: {
        type: 'string'
      },
      company_id: {
        type: 'string'
      }
    },
    required: [
      'amount',
      'provider',
      'charge_date',
      'destination_company_id',
      'company_id'
    ]
  }
}
