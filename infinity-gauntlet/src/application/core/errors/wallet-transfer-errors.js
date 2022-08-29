import StandardError from 'framework/core/errors/standard-error'

export class WalletTransferError extends StandardError {
  constructor(locale) {
    super(400, 'errors.wallet_transfer', locale)
  }
}

export class WalletTransferNotAuthorizedError extends StandardError {
  constructor(locale) {
    super(400, 'errors.wallet_transfer_not_authorized', locale)
  }
}

export class WalletTransferNotEnoughFundsError extends StandardError {
  constructor(locale, sourceFunds) {
    super(400, 'errors.wallet_transfer_not_enough_funds', locale, sourceFunds)
  }
}

export class WalletRevertTransferError extends StandardError {
  constructor(locale, transferId) {
    super(400, 'errors.wallet_revert_transfer', locale, transferId)
  }
}

export class WalletRevertTransferMaxAttemptsError extends StandardError {
  constructor(locale, transferId) {
    super(400, 'errors.wallet_revert_transfer_max_attempts', locale, transferId)
  }
}

export class WalletScheduledTransferInvalidDateError extends StandardError {
  constructor(locale, transferId) {
    super(
      400,
      'errors.wallet_schedule_transfer_invalid_date',
      locale,
      transferId
    )
  }
}
