import StandardError from 'framework/core/errors/standard-error'

export default class ModelNotFoundError extends StandardError {
  constructor(locale, modelName) {
    super(404, 'errors.model_not_found', locale, modelName)
  }
}
