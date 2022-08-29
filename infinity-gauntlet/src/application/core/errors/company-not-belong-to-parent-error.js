import StandardError from 'framework/core/errors/standard-error'

export default class CompanyNotBelongToParentError extends StandardError {
  constructor(locale) {
    super(400, 'errors.company_not_belong_to_parent', locale)
  }
}
