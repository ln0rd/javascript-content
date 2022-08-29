import StandardError from 'framework/core/errors/standard-error'

export default class MccAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.mcc_already_exists', locale)
  }
}
