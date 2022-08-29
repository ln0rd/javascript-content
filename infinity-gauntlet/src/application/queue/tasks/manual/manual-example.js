import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MANUAL_EXAMPLE_TASK' })

export default class ManualExample {
  static type() {
    return 'manual'
  }

  static handler(args) {
    return Promise.resolve().then(messageLog)

    function messageLog() {
      Logger.info(args)
      Logger.info('Manual example is done!')
    }
  }
}
