import StandardError from 'framework/core/errors/standard-error'

export default class ChildCompanyAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.child_company_already_exists', locale)
  }
}
