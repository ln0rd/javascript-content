import StandardError from 'framework/core/errors/standard-error'

export default class CelerTerminalAlreadyLinked extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_terminal_already_linked', locale)
  }
}
