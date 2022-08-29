import StandardError from 'framework/core/errors/standard-error'

export default class StoneCreateSecurityKeyError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_create_security_key', locale)
  }
}
