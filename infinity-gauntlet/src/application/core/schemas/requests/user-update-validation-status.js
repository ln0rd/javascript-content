import { userValidationStatusEnum } from 'application/core/domain/user-validation-status'

export default {
  name: 'request_user_update_validation_status',
  schema: {
    type: 'object',
    properties: {
      validation_status: {
        type: 'string',
        enum: userValidationStatusEnum
      }
    },
    required: ['validation_status']
  }
}
