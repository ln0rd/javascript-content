import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableGetTerminalData extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_get_terminal_data', locale)
  }
}
