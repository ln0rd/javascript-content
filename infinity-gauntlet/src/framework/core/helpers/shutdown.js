import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import { closeConnection as closeQueue } from 'framework/core/adapters/queue'
import { closeConnection as closeDatabase } from 'framework/core/adapters/database'
import { closeBigQueryConnection as closeBigQuery } from 'framework/core/adapters/bigquery'
import { quitRedis } from 'framework/core/adapters/redis'
import { quitIstio } from 'application/core/helpers/istio'

const Logger = createLogger({ name: 'SHUTDOWN_HELPER' })

export let isRunning = true

export const Signals = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15
}

function alertLog() {
  Logger.warn(`Gracefully shutting down the process ${process.pid}.`)
}

function closeServer() {
  // eslint-disable-next-line promise/avoid-new
  return new Promise(resolve => global.server.close(resolve))
}

function exitProcess(signal, value, justClose) {
  if (justClose) {
    Logger.warn(`Process ${process.pid} exited manually.`)
    process.exit(0)
  } else {
    Logger.warn(`Process ${process.pid} exited by signal ${signal}.`)
    process.exit(128 + value)
  }
}

export function apiShutdownHandler(signal, value, justClose = false) {
  return () => {
    isRunning = false

    return Promise.resolve()
      .tap(alertLog)
      .then(closeServer)
      .then(closeDatabase)
      .then(quitRedis)
      .then(closeQueue)
      .then(() => exitProcess(signal, value, justClose))
  }
}

export function shutdownHandler(signal, value, justClose = false) {
  return () => {
    isRunning = false

    return Promise.resolve()
      .tap(alertLog)
      .then(closeDatabase)
      .then(quitRedis)
      .then(closeBigQuery)
      .then(closeQueue)
      .then(quitIstio)
      .then(() => exitProcess(signal, value, justClose))
  }
}
