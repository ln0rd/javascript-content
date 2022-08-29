import StandardError from 'framework/core/errors/standard-error'

export default class CelerCommunicationFailureError extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_communication_failure_error', locale)
  }
}
