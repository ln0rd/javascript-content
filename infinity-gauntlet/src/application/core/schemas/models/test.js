export default {
  name: 'test',
  schema: {
    type: 'object',
    properties: {
      test_name: {
        type: 'string'
      },
      test_message: {
        type: 'string'
      }
    },
    required: ['test_name', 'test_message']
  }
}
