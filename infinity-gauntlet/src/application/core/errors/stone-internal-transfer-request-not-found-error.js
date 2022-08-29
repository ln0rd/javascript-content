import StandardError from 'framework/core/errors/standard-error'

export default class StoneInternalTransferRequestNotFoundError extends StandardError {
  constructor(locale) {
    super(400, 'errors.stone_internal_transfer_request_not_found', locale)
  }
}
