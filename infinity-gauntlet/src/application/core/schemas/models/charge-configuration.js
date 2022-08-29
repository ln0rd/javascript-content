export default {
  name: 'charge_configuration',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        minimum: 1
      },
      provider: {
        type: 'string',
        enum: ['stone', 'hash']
      },
      charge_method: {
        type: 'string',
        enum: ['balance_debit']
      },
      initial_charge_date: {
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
      'initial_charge_date',
      'destination_company_id',
      'interval',
      'company_id'
    ]
  }
}
