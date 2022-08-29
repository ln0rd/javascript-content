import StandardError from 'framework/core/errors/standard-error'

export default class CompanySaveError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.company_save_error', locale, err)
  }
}
