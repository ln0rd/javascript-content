import StandardError from 'framework/core/errors/standard-error'

export default class EmailNotDeliveredError extends StandardError {
  constructor(locale, error) {
    super(400, 'errors.email_not_delivered', locale, error.message)
  }
}
