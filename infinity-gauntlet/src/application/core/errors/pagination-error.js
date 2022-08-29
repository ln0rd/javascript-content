import StandardError from 'framework/core/errors/standard-error'

export default class PaginationError extends StandardError {
  constructor(locale, perPage) {
    super(400, 'errors.pagination', locale, perPage)
  }
}
