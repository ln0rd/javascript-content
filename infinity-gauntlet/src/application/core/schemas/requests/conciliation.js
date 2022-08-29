export default {
  name: 'conciliation',
  schema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        format: 'date'
      },
      end_date: {
        type: 'string',
        format: 'date'
      },
      company_query: {
        type: 'object'
      }
    },
    required: []
  }
}
