import StandardError from 'framework/core/errors/standard-error'

export default class InvalidHardwareSerialNumberError extends StandardError {
  constructor(locale) {
    super(400, 'errors.invalid_hardware_serial_number', locale)
  }
}
