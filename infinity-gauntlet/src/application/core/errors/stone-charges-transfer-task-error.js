import StandardError from 'framework/core/errors/standard-error'

export default class StoneChargesTransferTaskError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.stone_charges_transfer_task', locale, err.message)

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
