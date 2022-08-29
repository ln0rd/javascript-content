import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'EVENT_HANDLER_EXAMPLE' })

export default class EventHandlerExample {
  static version() {
    return '1.0.0'
  }

  static handler(args) {
    return Promise.resolve().then(handleEvent)

    function handleEvent() {
      Logger.info(args)
      Logger.info('Example handler is done!')
    }
  }
}
