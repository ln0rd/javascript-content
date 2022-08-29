export default {
  name: 'agreement-new',
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string'
      },
      description: {
        type: 'string'
      },
      active: {
        type: 'boolean'
      },
      url: {
        type: 'string'
      }
    },
    required: ['title', 'description', 'active', 'url']
  }
}
