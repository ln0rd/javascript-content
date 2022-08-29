import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'APPLICATION_INITIALIZER' })

export default function run() {
  return Promise.resolve().then(init)

  function init() {
    Logger.info('Application initializer loaded.')
  }
}
