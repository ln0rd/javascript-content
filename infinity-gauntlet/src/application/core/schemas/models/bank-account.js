export default {
  name: 'bank_account',
  schema: {
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
}
