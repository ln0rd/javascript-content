import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableToListTransactions extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_list_transactions', locale)
  }
}
