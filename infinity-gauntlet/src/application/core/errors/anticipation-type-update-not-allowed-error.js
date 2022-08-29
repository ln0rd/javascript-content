import StandardError from 'framework/core/errors/standard-error'

export default class AnticipationTypeUpdateNotAllowedError extends StandardError {
  constructor(locale) {
    super(400, 'errors.anticipation_type_update_not_allowed', locale)
  }
}
