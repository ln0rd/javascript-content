import StandardError from 'framework/core/errors/standard-error'

export default class CannotUpdateUser extends StandardError {
  constructor(locale) {
    super(403, 'errors.cannot_update_user', locale, '')
  }
}
