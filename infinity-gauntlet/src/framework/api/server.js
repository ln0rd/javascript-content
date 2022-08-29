import R from 'ramda'
import config from 'framework/core/config'
import initializer from 'framework/core/initializer'
import application from 'framework/api/application'
import createLogger from 'framework/core/adapters/logger'
import { Signals, apiShutdownHandler } from 'framework/core/helpers/shutdown'
import { fatalErrorHandler } from 'framework/core/adapters/error-reporter'

const Logger = createLogger({ name: 'SERVER' })

function startServer(server) {
  // eslint-disable-next-line promise/avoid-new
  return new Promise(resolve => {
    Logger.info('Starting server.')

    server.listen(config.api.server.port, () => {
      global.uptime = new Date()
      global.server = server

      Logger.info('Server started successfully.')

      return resolve()
    })
  })
}

export default async function run(opts = {}) {
  try {
    await initializer(opts)
    const server = await application(opts)
    await startServer(server)
  } catch (err) {
    fatalErrorHandler('SERVER')(err)
  }
}

// Graceful Shutdown
R.forEach(signal => {
  process.on(signal, apiShutdownHandler(signal, Signals[signal]))
}, R.keys(Signals))
