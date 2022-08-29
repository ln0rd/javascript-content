export default {
  name: 'request_create_permission',
  schema: {
    type: 'object',
    properties: {
      create: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      read: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      update: {
        type: 'array',
        items: {
          type: 'string'
        }
      },
      delete: {
        type: 'array',
        items: {
          type: 'string'
        }
      }
    },
    minProperties: 1
  }
}
