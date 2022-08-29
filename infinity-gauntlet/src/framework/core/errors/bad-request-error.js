import StandardError from 'framework/core/errors/standard-error'

export default class BadRequestError extends StandardError {
  constructor(locale) {
    super(400, 'errors.handlers.bad_request', locale)

    this.list = [
      {
        type: this.name,
        parameter_name: null,
        message: this.message
      }
    ]
  }
}
