import StandardError from 'framework/core/errors/standard-error'

export class TriggeredEventVersionMismatchError extends StandardError {
  constructor(locale, handlerVersion, comparison, requiredVersion) {
    super(
      400,
      'errors.triggered_event_version_mismatch_error',
      locale,
      `${handlerVersion} ${comparison} ${requiredVersion}`
    )
  }
}

export class TriggerEventError extends StandardError {
  constructor(locale) {
    super(400, 'errors.trigger_event_error', locale)
  }
}

export class TriggeredEventMaxRetriesExceededError extends StandardError {
  constructor(locale) {
    super(400, 'errors.triggered_event_max_retries_error', locale)
  }
}
