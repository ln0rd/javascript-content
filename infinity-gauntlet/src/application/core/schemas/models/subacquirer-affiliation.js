export default {
  name: 'subacquirer_affiliation',
  schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1
      },
      document_number: {
        type: 'string',
        format: 'document_number'
      },
      full_name: {
        type: 'string'
      },
      mcc: {
        type: 'string'
      },
      contact: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          phone: {
            type: 'string'
          },
          email: {
            type: 'string'
          }
        },
        required: ['name', 'phone', 'email']
      },
      address: {
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
        required: ['street', 'neighborhood', 'zipcode', 'street_number']
      },
      bank_account: {
        type: 'object',
        properties: {
          bank_code: {
            type: 'string'
          },
          agencia: {
            type: 'string'
          },
          agencia_dv: {
            type: 'string'
          },
          conta: {
            type: 'string'
          },
          conta_dv: {
            type: 'string'
          }
        },
        required: ['bank_code', 'agencia', 'conta', 'conta_dv']
      }
    },
    required: ['name', 'document_number', 'mcc', 'contact', 'address']
  }
}
