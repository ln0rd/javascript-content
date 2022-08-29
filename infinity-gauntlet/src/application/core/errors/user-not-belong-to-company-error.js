import StandardError from 'framework/core/errors/standard-error'

export default class UserNotBelongToCompanyError extends StandardError {
  constructor(locale) {
    super(400, 'errors.user_not_belong_to_company', locale)
  }
}
