import StandardError from 'framework/core/errors/standard-error'

export default class CannotInviteUser extends StandardError {
  constructor(locale) {
    super(403, 'errors.cannot_invite_user', locale, '')
  }
}
