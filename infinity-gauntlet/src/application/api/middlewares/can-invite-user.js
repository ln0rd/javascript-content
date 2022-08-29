import HashboardService from 'application/core/services/hashboard'
import CannotInviteUser from 'application/core/errors/cannot-invite-user'
import createLogger from 'framework/core/adapters/logger'
import {
  getUserAccessLevel,
  getRootAccessLevel
} from 'application/core/helpers/access-level'

const Logger = createLogger({ name: 'CAN_INVITE_USER' })

async function authorize(req, res, next) {
  try {
    var { dashboard, accessControl } = await HashboardService.getConfigFile(
      req.get('locale'),
      req.headers,
      true
    )

    if (dashboard.accessControlEnabled === false) {
      return next() // ISO doesn't have access control enabled
    }

    const { roles: ISORoles } = accessControl
    if (!ISORoles) {
      return next() // ISO accessControl doesn't have roles
    }

    const rootAccessLevel = getRootAccessLevel(ISORoles)
    const userAccessLevel = await getUserAccessLevel(
      ISORoles,
      req.get('user').id
    )

    const isRootUser = userAccessLevel === rootAccessLevel

    // root user can do everything
    if (isRootUser) {
      return next()
    }

    const invitedUserRole = ISORoles[req.body.role.type.toUpperCase()]

    // users can only create other users with equal or lower privelege
    if (userAccessLevel <= invitedUserRole.accessLevel) {
      return next()
    }

    return next(new CannotInviteUser(req.get('locale')))
  } catch (err) {
    Logger.error('failed to authorize user invitation', err)
  }
}

export function canInviteUser(req, res, next) {
  // ignore if authentication using hash key
  if (!req.get('user')) {
    return next()
  }

  return authorize(req, res, next)
}
