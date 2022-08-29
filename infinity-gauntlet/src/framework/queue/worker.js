import R from 'ramda'
import { join } from 'path'
import Promise from 'bluebird'
import config from 'framework/core/config'
import initializer from 'framework/core/initializer'
import createLogger from 'framework/core/adapters/logger'
import { consumeQueue } from 'framework/core/adapters/queue'
import { fatalErrorHandler } from 'framework/core/adapters/error-reporter'
import { Signals, shutdownHandler } from 'framework/core/helpers/shutdown'

const Logger = createLogger({ name: 'WORKER' })

const Base = join(
  config.root_path,
  'build',
  'application',
  'queue',
  'tasks',
  'triggered'
)

Promise.config({
  cancellation: true
})

export default function run() {
  return Promise.resolve()
    .tap(loadInitializer)
    .then(requireTask)
    .catch(fatalErrorHandler('WORKER'))

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

    if (!TaskEnabled) {
      return Logger.info(`Task ${Task.name} not loaded because was disabled.`)
    }

    Logger.info(`${Task.name} loaded successfully.`)

    Logger.info(`Starting task ${Task.name}.`)

    return consumeQueue(Task.name, Task.handler)
  }
}

// Graceful Shutdown
R.forEach(signal => {
  process.on(signal, shutdownHandler(signal, Signals[signal]))
}, R.keys(Signals))
