import StandardError from 'framework/core/errors/standard-error'

export default class CelerNoTerminalFound extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_no_terminal_found', locale)
  }
}
