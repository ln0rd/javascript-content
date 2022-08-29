import StandardError from 'framework/core/errors/standard-error'

export class ConciliationError extends StandardError {
  constructor(locale) {
    super(400, 'errors.conciliation_error', locale)
  }
}
