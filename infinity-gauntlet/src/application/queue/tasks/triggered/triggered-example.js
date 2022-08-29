import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'TRIGGERED_EXAMPLE_TASK' })

export default class TriggeredExample {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    return Promise.resolve()
      .then(parseMsg)
      .then(messageLog)

    function parseMsg() {
      return JSON.parse(msg)
    }

    function messageLog(parsedMsg) {
      Logger.info(parsedMsg)
      Logger.info('Triggered example is done!')
    }
  }
}
