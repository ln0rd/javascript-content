import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableToCreateTerminal extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_create_terminal', locale)
  }
}
