import StandardError from 'framework/core/errors/standard-error'

export class AnticipationInvalidDateError extends StandardError {
  constructor(locale, type) {
    if (type === 'business') {
      super(400, 'errors.anticipation_invalid_business_date', locale)
    } else {
      super(400, 'errors.anticipation_invalid_date', locale)
    }
  }
}

export class AnticipationBusinessHoursError extends StandardError {
  constructor(locale) {
    super(400, 'errors.anticipation_business_hours', locale)
  }
}

export class AnticipationPendingAlreadyExistsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.anticipation_pending_exists', locale)
  }
}

export class AnticipationError extends StandardError {
  constructor(locale) {
    super(400, 'errors.spot_anticipation', locale)
  }
}

export class AnticipationNotEnoughFundsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.anticipation_not_enough_funds', locale)
  }
}

export class SpotAnticipationRevertError extends StandardError {
  constructor(locale) {
    super(400, 'errors.spot_anticipation_revert', locale)
  }
}

export class SpotAnticipationRevertMaxAttemptsError extends StandardError {
  constructor(locale) {
    super(400, 'errors.spot_anticipation_revert_max_attempts', locale)
  }
}
