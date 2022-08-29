export default {
  name: 'wallet_transfer',
  schema: {
    type: 'object',
    properties: {
      requested_amount: {
        type: 'integer',
        minimum: 1
      },
      source_wallet_id: {
        type: 'string'
      },
      destination_wallet_id: {
        type: 'string'
      },
      get_balances: {
        type: 'boolean'
      },
      request_id: {
        type: 'string'
      },
      scheduled: {
        type: 'boolean'
      },
      schedule_to: {
        type: 'string',
        format: 'date'
      },
      description: {
        type: 'string'
      }
    },
    required: ['requested_amount', 'source_wallet_id', 'destination_wallet_id'],
    dependencies: {
      scheduled: { required: ['schedule_to'] }
    }
  }
}
