import StandardError from 'framework/core/errors/standard-error'

export default class StoneGetHardwareError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_get_hardware', locale)
  }
}
