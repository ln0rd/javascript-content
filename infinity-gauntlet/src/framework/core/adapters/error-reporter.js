import R from 'ramda'
import * as Sentry from '@sentry/node'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ERROR_REPORTER_ADAPTER' })

if (config.core.errorReporter.enabled) {
  Sentry.init({
    dsn: config.core.errorReporter.dsn,
    environment: config.core.errorReporter.options.environment,
    release: config.core.errorReporter.options.release,
    serverName: config.core.errorReporter.options.name,
    integrations: [
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection()
    ]
  })
}

export function wrapError(cb) {
  Logger.info(`Running on Environment => ${process.env.NODE_ENV}.`)

  if (config.core.errorReporter.enabled) {
    Logger.info('Error reporter initialized successfully')

    try {
      cb()
    } catch (error) {
      Sentry.captureException(error)
    }

    return
  }

  Logger.info('Error reporter is not enabled')

  return cb()
}

export function captureError(
  err,
  metadata = { logger: 'GLOBAL', level: 'error' },
  disableLogs = false,
  cb = () => {}
) {
  if (!disableLogs) {
    Logger.error({ err }, 'Error captured')
  }

  function sentryResponseHandler(err, eventId) {
    if (err) {
      Logger.error({ err }, 'Failed to send the captured error to Sentry')
    } else {
      Logger.debug(
        { eventId },
        'Captured error was sent to Sentry successfully'
      )
    }

    return cb()
  }

  if (config.core.errorReporter.enabled) {
    Sentry.captureException(err, {
      tags: {
        logger: metadata.logger || 'GLOBAL'
      },
      level: metadata.level,
      extra: R.omit(['logger', 'level'], metadata)
    })
    sentryResponseHandler()
  } else {
    Logger.warn(
      { err },
      'Error not captured because the error reporter is not enabled.'
    )
  }

  return cb()
}

export function fatalErrorHandler(name) {
  return err => {
    function exitOnErrorSent() {
      Logger.fatal(
        { name, err, pid: process.pid },
        'Process exited due to fatal error'
      )
      process.exit(1)
    }

    return captureError(
      err,
      {
        logger: name,
        level: 'fatal'
      },
      true,
      exitOnErrorSent
    )
  }
}
