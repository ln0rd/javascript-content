import StandardError from 'framework/core/errors/standard-error'

export class EventHandlerNotEnabledError extends StandardError {
  constructor(locale) {
    super(400, 'errors.event_handler_not_enabled_error', locale)
  }
}

export class EventHandlerNotFoundError extends StandardError {
  constructor(locale) {
    super(400, 'errors.event_handler_not_found_error', locale)
  }
}
