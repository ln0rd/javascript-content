import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'PERIODIC_EXAMPLE_TASK' })

export default class PeriodicExample {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '0 */1 * * * *'
  }

  static handler() {
    return Promise.resolve().then(messageLog)

    function messageLog() {
      Logger.info('Periodic example is done!')
    }
  }
}
