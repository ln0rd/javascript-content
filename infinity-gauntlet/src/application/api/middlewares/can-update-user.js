import HashboardService from 'application/core/services/hashboard'
import CannotUpdateUser from 'application/core/errors/cannot-update-user'
import createLogger from 'framework/core/adapters/logger'
import {
  getRequestAccessLevel,
  getUserAccessLevel,
  getRootAccessLevel
} from 'application/core/helpers/access-level'

const Logger = createLogger({ name: 'CAN_UPDATE_USER' })

async function authorize(req, res, next) {
  try {
    if (!req.headers || !req.headers.origin) {
      return next(new CannotUpdateUser(req.get('locale')))
    }

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
    const isUpdateAnotherUser = req.get('user').id !== req.params.id

    // root user can everything
    if (isRootUser) {
      return next()
    }

    const { user_metadata = {} } = req.body || {}

    const { type: requestRole = null } = user_metadata

    // Non-root user editing yourself, but without role update.
    // (don't send in user_metadata: {type: role} in the request body)
    if (!requestRole && !isUpdateAnotherUser) {
      return next()
    }

    const requestRoleAccessLevel = getRequestAccessLevel(ISORoles, requestRole)
    const paramsUserAccessLevel = await getUserAccessLevel(
      ISORoles,
      req.params.id
    )

    const itsChangedUserAccessLevel =
      requestRoleAccessLevel !== paramsUserAccessLevel

    // Non-root user editing yourself.
    // He sends role in the request body, this role is the same that user has.
    if (!itsChangedUserAccessLevel && !isUpdateAnotherUser) {
      return next()
    }

    return next(new CannotUpdateUser(req.get('locale')))
  } catch (err) {
    Logger.error('Error when authorize canUpdateUser', err)
  }
}

export function canUpdateUser(req, res, next) {
  // ignore if authentication using hash key
  if (!req.get('user')) {
    return next()
  }

  Logger.debug('Authorize user update')

  return authorize(req, res, next)
}
