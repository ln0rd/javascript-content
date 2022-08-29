export default {
  name: 'request_user_onboarding_validation',
  schema: {
    type: 'object',
    properties: {
      company_id: {
        type: 'string'
      },
      sdk_token: {
        type: 'string'
      },
      matrix_name: {
        type: 'string'
      }
    },
    required: ['company_id', 'sdk_token', 'matrix_name']
  }
}
