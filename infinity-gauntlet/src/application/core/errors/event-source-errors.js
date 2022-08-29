import StandardError from 'framework/core/errors/standard-error'

export class EventSourceNotEnabledError extends StandardError {
  constructor(locale, source) {
    super(400, 'errors.event_source_not_enabled_error', locale, source)
  }
}

export class EventSourceNotFoundError extends StandardError {
  constructor(locale, source) {
    super(400, 'errors.event_source_not_found_error', locale, source)
  }
}
