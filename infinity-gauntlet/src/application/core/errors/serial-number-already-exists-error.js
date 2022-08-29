import StandardError from 'framework/core/errors/standard-error'

export default class SerialNumberAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.serial_number_already_exists', locale)
  }
}
