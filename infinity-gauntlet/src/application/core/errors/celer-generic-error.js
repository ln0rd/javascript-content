import StandardError from 'framework/core/errors/standard-error'

export default class CelerGenericError extends StandardError {
  constructor(locale, error) {
    super(400, 'errors.celer_generic_error', locale, error.message)
  }
}
