import { companyStatusEnum } from 'application/core/domain/company-status'

export default {
  name: 'request_update_company_status',
  schema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: companyStatusEnum
      }
    },
    required: ['status']
  }
}
