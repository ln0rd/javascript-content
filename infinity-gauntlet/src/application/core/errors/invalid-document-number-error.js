import StandardError from 'framework/core/errors/standard-error'

export default class InvalidDocumentNumberError extends StandardError {
  constructor(locale, documentNumber) {
    super(400, 'errors.invalid_document_number', locale, documentNumber)
  }
}
