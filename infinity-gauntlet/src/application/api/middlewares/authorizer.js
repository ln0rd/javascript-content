import R from 'ramda'
import Promise from 'bluebird'
import ApiKey from 'application/core/models/api-key'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'
import InternalServerError from 'framework/core/errors/internal-server-error'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'

const Logger = createLogger({ name: 'AUTHORIZER_MIDDLEWARE' })

export function checkPermissions(req, res, next) {
  let authMethod
  let authorizedResources = []

  return Promise.resolve()
    .then(getPermissions)
    .then(checkPermission)
    .then(callNext)
    .catch(errorHandler)

  function getPermissions() {
    authMethod = req.get('authenticationMethod')

    if (authMethod === 'api_key') {
      return ApiKey.findOne({ _id: req.get(authMethod).id, enabled: true })
        .populate({
          path: 'permissions',
          populate: {
            path: 'create read update delete'
          }
        })
        .select('permissions')
        .lean()
        .exec()
    } else if (['jwt', 'hash_key'].includes(authMethod)) {
      return Company.findOne({ _id: req.get('company').id })
        .populate({
          path: 'permissions',
          populate: {
            path: 'create read update delete'
          }
        })
        .select('permissions')
        .lean()
        .exec()
    } else {
      return {
        permissions: []
      }
    }
  }

  function checkPermission(allPermissions) {
    if (!allPermissions.permissions) {
      throw new UnauthorizedError(req.get('locale'), authMethod)
    }

    const permissions = allPermissions.permissions.filter(perm => perm.enabled)
    let operation

    switch (req.route.method) {
      case 'GET':
        operation = 'read'
        break

      case 'POST':
        operation = 'create'
        break

      case 'PUT' || 'PATCH':
        operation = 'update'
        break

      case 'DELETE':
        operation = 'delete'
        break

      default:
        break
    }

    return Promise.resolve()
      .then(concatPermissions)
      .then(checkResources)
      .spread(checkAccess)

    function concatPermissions() {
      let matchingPermissions = []

      R.forEach(permission => {
        matchingPermissions = matchingPermissions.concat(permission[operation])
      }, permissions)

      return matchingPermissions
    }

    function checkResources(resources) {
      let matchingResources = []

      R.forEach(resource => {
        matchingResources = matchingResources.concat(
          resource.permits[operation]
        )
      }, resources)

      return [matchingResources, resources]
    }

    function checkAccess(permits, resources) {
      return permits.reduce((accessGranted, permissionUrl, index) => {
        let grants = accessGranted || req.url.match(new RegExp(permissionUrl))

        if (grants) {
          authorizedResources.push(resources[index])
        }

        return grants
      }, false)
    }
  }

  function callNext(accessGranted) {
    if (accessGranted) {
      req.set('authorized_resources', authorizedResources)
      return next()
    } else {
      throw new UnauthorizedError(req.get('locale'), authMethod)
    }
  }

  function errorHandler(err) {
    Logger.error(
      { err },
      `An error occurred on the authorizer middleware for ${authMethod}`
    )

    if (err.public) {
      return next(err)
    }

    return next(new InternalServerError(req.get('locale'), err))
  }
}

export function authorizer(req, res, next) {
  const authMethod = req.get('authenticationMethod')

  if (['api_key', 'hash_key', 'jwt'].includes(authMethod)) {
    return checkPermissions(req, res, next)
  }

  return next(new UnauthorizedError(req.get('locale'), authMethod))
}
