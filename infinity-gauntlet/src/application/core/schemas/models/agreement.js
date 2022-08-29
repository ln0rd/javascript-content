export default {
  name: 'agreement',
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      created_at: {
        type: 'string'
      },
      active: {
        type: 'boolean'
      },
      url: {
        type: 'string'
      }
    },
    required: ['title', 'description', 'created_at', 'active', 'url']
  }
}
