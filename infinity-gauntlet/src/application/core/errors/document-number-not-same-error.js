import StandardError from 'framework/core/errors/standard-error'

export default class DocumentNumberNotSameError extends StandardError {
  constructor(locale) {
    super(400, 'errors.document_number_not_same', locale)
  }
}
