import { mapModel } from 'application/core/helpers/responder'
import config from 'application/core/config'
import moment from 'moment-timezone'
import * as userValidationStatus from 'application/core/domain/user-validation-status'

export function userResponder(model) {
  return mapModel(model, user => {
    if (!user) {
      user = {}
    }

    return {
      object: 'user',
      id: user._id || null,
      email: user.email || null,
      name: user.name || null,
      created_at: user.created_at,
      status: user.status || null,
      validation_status: user.validation_status || userValidationStatus.PENDING,
      phone_number: user.phone_number || null,
      document_number: user.document_number || null,
      user_metadata: user.user_metadata || {},
      permissions: user.permissions,
      needs_update: checkIfNeedsUpdate(user)
    }
  })
}

function checkIfNeedsUpdate(user) {
  if (!user.last_info_update) {
    return true
  }

  const today = moment()
  const lastUpdate = moment(user.last_info_update, 'YYYY-MM-DD')
  const daysSinceLastUpdate = Math.abs(lastUpdate.diff(today, 'days'))

  return daysSinceLastUpdate > config.users.update_data_timeout
}
