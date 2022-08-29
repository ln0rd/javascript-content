export default {
  name: 'transaction',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        minimum: 1
      },
      provider_transaction_id: {
        type: 'string'
      },
      provider: {
        type: 'string'
      },
      card_hash: {
        type: 'string'
      },
      card_id: {
        type: 'string'
      },
      card_number: {
        type: 'string',
        format: 'card_number'
      },
      card_holder_name: {
        type: 'string'
      },
      card_expiration_date: {
        type: 'string'
      },
      card_cvv: {
        type: 'string',
        maxLength: 4,
        minLength: 3
      },
      payment_method: {
        type: 'string'
      },
      installments: {
        type: 'number',
        minimum: 1,
        maximum: 18
      },
      boleto_expiration_date: {
        type: 'String'
      },
      soft_descriptor: {
        type: 'string',
        maxLength: 13
      },
      capture: {
        type: 'boolean'
      },
      boleto_instructions: {
        type: 'string',
        maxLength: 255
      }
    },
    required: ['amount', 'installments', 'provider_transaction_id']
  }
}
