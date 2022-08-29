import StandardError from 'framework/core/errors/standard-error'

export default class StoneInternalTransfersTaskError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.stone_internal_transfers_task', locale, err.message)

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
