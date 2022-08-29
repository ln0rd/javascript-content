import StandardError from 'framework/core/errors/standard-error'

export default class UserSaveError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.user_save_error', locale, err)
  }
}
