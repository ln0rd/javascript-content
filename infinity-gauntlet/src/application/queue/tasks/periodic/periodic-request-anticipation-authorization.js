import createLogger from 'framework/core/adapters/logger'
import ManualRequestAnticipationAuthorization from 'application/queue/tasks/manual/anticipation/manual-request-anticipation-authorization'

const Logger = createLogger({
  name: 'REQUEST_ANTICIPATION_AUTHORIZATION'
})

export default class PeriodicRequestAnticipationAuthorization {
  static type() {
    return 'periodic'
  }

  static expression() {
    // At every 3rd minute from 1 through 59 past every hour from
    // 8 through 22 on every day-of-week from Monday through Friday.

    // TODO: go back to days 1-5 after testing
    return '1-59/3 8-22 * * *'
  }

  static async handler() {
    Logger.info('periodic-anticipation-authorization-started')

    await ManualRequestAnticipationAuthorization.handler()

    Logger.info('periodic-anticipation-authorization-finished')
  }
}
