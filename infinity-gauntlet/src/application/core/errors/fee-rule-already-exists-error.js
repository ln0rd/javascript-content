import StandardError from 'framework/core/errors/standard-error'

export default class FeeRuleAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.fee_rule_already_exists', locale)
  }
}
