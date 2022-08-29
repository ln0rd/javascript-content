import StandardError from 'framework/core/errors/standard-error'

export default class DelayRetryError extends StandardError {
  constructor(locale, delay) {
    super(400, 'errors.delay', locale)
    this.delay = delay
  }
}
