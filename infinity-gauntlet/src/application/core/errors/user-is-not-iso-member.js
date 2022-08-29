import StandardError from 'framework/core/errors/standard-error'

export default class UserIsNotISOMember extends StandardError {
  constructor(locale) {
    super(403, 'errors.user_must_be_iso_member', locale, '')
  }
}
