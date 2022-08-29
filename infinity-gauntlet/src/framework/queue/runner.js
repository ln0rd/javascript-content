import R from 'ramda'
import { join } from 'path'
import Promise from 'bluebird'
import {
  startProcessTimer,
  endProcessTimer
} from 'framework/core/helpers/timer'
import config from 'framework/core/config'
import initializer from 'framework/core/initializer'
import createLogger from 'framework/core/adapters/logger'
import { fatalErrorHandler } from 'framework/core/adapters/error-reporter'
import { Signals, shutdownHandler } from 'framework/core/helpers/shutdown'

const Logger = createLogger({ name: 'RUNNER' })

const Base = join(
  config.root_path,
  'build',
  'application',
  'queue',
  'tasks',
  'manual'
)

Promise.config({
  cancellation: true
})

export default function run() {
  const ProcessTimer = startProcessTimer()

  return Promise.resolve()
    .then(loadInitializer)
    .then(requireTask)
    .catch(fatalErrorHandler('RUNNER'))
    .finally(exitTask)

  function loadInitializer() {
    return initializer()
  }

  function requireTask() {
    const File = process.env.TASK || ''
    const Task = require(join(Base, File)).default
    const TaskEnabled = process.env.TASK_ENABLED === 'true' ? true : false

    if (!Task) {
      throw new Error(
        `Invalid task ${File}. Tasks should export a default class.`
      )
    }

    if (!R.is(Function, Task.type)) {
      throw new Error(
        `Invalid task ${File}. Tasks should have a static method 'type'.`
      )
    }

    if (!R.is(Function, Task.handler)) {
      throw new Error(
        `Invalid task ${File}. Tasks should have a static method 'handler'.`
      )
    }

    if (Task.type() !== 'manual') {
      return Logger.info(
        `Task ${Task.name} not runned because the 'type' is not 'manual'.`
      )
    }

    if (!TaskEnabled) {
      return Logger.info(`Task ${Task.name} not runned because was disabled.`)
    }

    return Promise.resolve()
      .tap(startingLog)
      .then(executeHandler)
      .then(success)

    function startingLog() {
      Logger.info(`Starting task ${Task.name}.`)
    }

    function executeHandler() {
      const Args = R.split(',', process.env.TASK_PARAMS || '')

      Logger.info(`Running task ${Task.name} with arguments: ${Args}`)

      return Task.handler(Args)
    }

    function success() {
      Logger.info(`Task ${Task.name} has been finished successfully.`)
    }
  }

  function exitTask() {
    Logger.info(`Task exited after ${endProcessTimer(ProcessTimer)}.`)

    return shutdownHandler(null, null, true)()
  }
}

// Graceful Shutdown
R.forEach(signal => {
  process.on(signal, shutdownHandler(signal, Signals[signal]))
}, R.keys(Signals))
