import StandardError from 'framework/core/errors/standard-error'

export default class EventAlreadyDelivered extends StandardError {
  constructor(locale) {
    super(400, 'errors.event_already_delivered', locale)
  }
}
