export default {
  name: 'address',
  schema: {
    type: 'object',
    properties: {
      street: {
        type: 'string'
      },
      street_number: {
        type: 'string'
      },
      complement: {
        type: 'string'
      },
      neighborhood: {
        type: 'string'
      },
      zipcode: {
        type: 'string'
      },
      country: {
        type: 'string'
      },
      state: {
        type: 'string'
      },
      city: {
        type: 'string'
      }
    },
    required: ['street', 'neighborhood', 'zipcode']
  }
}
