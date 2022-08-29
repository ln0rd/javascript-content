export default {
  name: 'request_hashboard_add_url',
  schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        format: 'uri-reference'
      },
      enabled: {
        type: 'boolean'
      }
    },
    required: ['url']
  }
}
