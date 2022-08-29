import StandardError from 'framework/core/errors/standard-error'

export default class PermissionResourceNotAllowedError extends StandardError {
  constructor(locale) {
    super(400, 'errors.permission_resource_not_allowed', locale)
  }
}
