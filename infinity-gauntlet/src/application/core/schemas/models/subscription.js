export default {
  name: 'subscription',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        required: true
      },
      charges: {
        type: 'number'
      },
      installments: {
        type: 'number'
      },
      day: {
        type: 'number'
      },
      frequency: {
        type: 'string'
      },
      current_charge: {
        type: 'number'
      },
      current_period_start: {
        type: 'date'
      },
      current_period_end: {
        type: 'date'
      },
      amount: {
        type: 'number',
        minimum: 1
      },
      trial_days: {
        type: 'number'
      },
      status: {
        type: 'string'
      },
      metadata: {
        type: 'string'
      },
      payment_methods: {
        type: 'array',
        minItems: 1
      },
      payment_method: {
        type: 'string'
      },
      payment_provider: {
        type: 'string'
      },
      post_deadline_rules: {
        type: 'object',
        properties: {
          charges_attempts: {
            type: 'number',
            minimum: 1
          },
          charges_interval: {
            type: 'number',
            minimum: 1
          },
          cancel_subscription_after_charges: {
            type: 'boolean'
          }
        }
      }
    },
    required: [
      'name',
      'day',
      'frequency',
      'amount',
      'payment_method',
      'payment_provider'
    ]
  }
}
