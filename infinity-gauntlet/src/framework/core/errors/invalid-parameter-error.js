import StandardError from 'framework/core/errors/standard-error'

export default class InvalidParameterError extends StandardError {
  constructor(locale, parameterName) {
    super(400, 'errors.invalid_parameter', locale, parameterName)

    this.list = [
      {
        type: this.name,
        parameter_name: parameterName,
        message: this.message
      }
    ]
  }
}
