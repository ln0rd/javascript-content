export default {
  name: 'card',
  schema: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        enum: ['mundipagg']
      },
      card_number: {
        type: 'string',
        format: 'card_number'
      },
      card_holder_name: {
        type: 'string'
      },
      card_expiration_date: {
        type: 'string',
        format: 'expiration_date'
      },
      card_cvv: {
        type: 'string',
        maxLength: 4,
        minLength: 3
      }
    },
    required: [
      'card_number',
      'card_holder_name',
      'card_expiration_date',
      'card_cvv'
    ]
  }
}
