export default {
  name: 'order',
  schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        minimum: 1
      },
      owner_document_numner: {
        type: 'string',
        format: 'document_number'
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              minimum: 1
            },
            quantity: {
              type: 'number',
              minimum: 1
            }
          },
          required: ['amount', 'quantity']
        }
      }
    },
    required: ['amount']
  }
}
