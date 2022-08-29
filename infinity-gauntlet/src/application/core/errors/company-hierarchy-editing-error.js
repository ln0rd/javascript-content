import StandardError from 'framework/core/errors/standard-error'

export default class CompanyHierarchyEditingError extends StandardError {
  constructor(locale, email) {
    super(400, 'errors.company_hierarchy_editing', locale, email)
  }
}
