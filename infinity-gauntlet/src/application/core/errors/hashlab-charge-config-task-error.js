import StandardError from 'framework/core/errors/standard-error'

export default class HashlabChargeConfigTaskError extends StandardError {
  constructor(locale, err) {
    super(500, 'errors.hashlab_charge_config_task_error', locale, err.message)

    this.stack = err.stack
  }
}
