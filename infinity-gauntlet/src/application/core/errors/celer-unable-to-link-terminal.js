import StandardError from 'framework/core/errors/standard-error'

export default class CelerUnableToLinkTerminal extends StandardError {
  constructor(locale) {
    super(400, 'errors.celer_unable_to_link_terminal', locale)
  }
}
