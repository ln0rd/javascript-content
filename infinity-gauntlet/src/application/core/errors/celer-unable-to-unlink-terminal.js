import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableToUnlinkTerminal extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_unlink_terminal', locale)
  }
}
