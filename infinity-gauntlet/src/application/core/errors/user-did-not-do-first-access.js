import StandardError from 'framework/core/errors/standard-error'

export default class UserDidNotDoFirstAccess extends StandardError {
  constructor(locale) {
    super(403, 'errors.user_did_not_do_first_access', locale, '')
  }
}
