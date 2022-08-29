import StandardError from 'framework/core/errors/standard-error'

export default class PermissionResourceNotFound extends StandardError {
  constructor(locale) {
    super(400, 'errors.permission_resource_not_found', locale)
  }
}
