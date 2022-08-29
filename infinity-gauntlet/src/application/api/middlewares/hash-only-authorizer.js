import config from 'application/core/config'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'

export function hashOnlyAuthorizer(req, res, next) {
  let authMethod = req.get('authenticationMethod')
  const company = req.get('company')

  if (company && company.id === config.permissions.hash_id) {
    return next()
  } else {
    return next(new UnauthorizedError(req.get('locale'), authMethod))
  }
}
