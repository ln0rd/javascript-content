import StandardError from 'framework/core/errors/standard-error'

export default class UserInviteCompanyPermissionError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.user_invite_company_permission', locale, err)
  }
}
