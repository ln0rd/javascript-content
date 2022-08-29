export default {
  name: 'request_create_permission_resource',
  schema: {
    type: 'object',
    properties: {
      permits: {
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
        }
      },
      name: {
        type: 'string'
      },
      public: {
        type: 'boolean'
      },
      enabled: {
        type: 'boolean'
      }
    },
    required: ['name']
  }
}
