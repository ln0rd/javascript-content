import R from 'ramda'
import Promise from 'bluebird'
import initializer from 'framework/core/initializer'
import webHookHandler from 'application/webhook/handler'
import createLogger from 'framework/core/adapters/logger'
import { consumeWebHookQueue } from 'application/webhook/helpers/queue'
import { fatalErrorHandler } from 'framework/core/adapters/error-reporter'
import { Signals, shutdownHandler } from 'framework/core/helpers/shutdown'

const Logger = createLogger({ name: 'WEBHOOK' })

Promise.config({
  cancellation: true
})

export default function run() {
  return Promise.resolve()
    .tap(loadInitializer)
    .then(loadConsumer)
    .catch(fatalErrorHandler('WEBHOOK'))

  function loadInitializer() {
    return initializer()
  }

  function loadConsumer() {
    Logger.info(`Starting WebHook deliverer.`)

    return consumeWebHookQueue(webHookHandler)
  }
}

// Graceful Shutdown
R.forEach(signal => {
  process.on(signal, shutdownHandler(signal, Signals[signal]))
}, R.keys(Signals))
