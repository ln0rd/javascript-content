import StandardError from 'framework/core/errors/standard-error'

export default class InvalidSplitRuleSameCompanyIdError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_split_rule_company_id', locale)
  }
}
