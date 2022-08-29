import StandardError from 'framework/core/errors/standard-error'

export default class CompanyHierarchyNotEditingError extends StandardError {
  constructor(locale) {
    super(400, 'errors.company_hierarchy_not_editing', locale)
  }
}
