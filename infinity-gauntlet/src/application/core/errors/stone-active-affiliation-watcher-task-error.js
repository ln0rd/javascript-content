import StandardError from 'framework/core/errors/standard-error'

export default class StoneActiveAffiliationWatcherTaskError extends StandardError {
  constructor(locale, err) {
    super(
      500,
      'errors.stone_active_affiliation_watcher_task',
      locale,
      err.message
    )

    this.previousMessage = err.message
    this.previousStack = err.stack
  }
}
