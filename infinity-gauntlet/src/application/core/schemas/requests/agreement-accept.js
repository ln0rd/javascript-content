export default {
  name: 'agreement-accept',
  schema: {
    type: 'object',
    properties: {
      agreement_id: {
        type: 'string'
      }
    },
    required: ['agreement_id']
  }
}
