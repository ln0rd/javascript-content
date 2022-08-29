export default {
  name: 'integration_request',
  schema: {
    type: 'object',
    properties: {
      integration: {
        type: 'string'
      },
      model: {
        type: 'string'
      },
      model_id: {
        type: 'integer'
      },
      data: {
        type: 'object'
      }
    },
    required: ['integration', 'model', 'model_id', 'data']
  }
}
