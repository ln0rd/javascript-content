import R from 'ramda'
import { join } from 'path'
import Cron from 'node-cron'
import Promise from 'bluebird'
import config from 'framework/core/config'
import {
  captureError,
  fatalErrorHandler
} from 'framework/core/adapters/error-reporter'
import initializer from 'framework/core/initializer'
import createLogger from 'framework/core/adapters/logger'
import { Signals, shutdownHandler } from 'framework/core/helpers/shutdown'

const Logger = createLogger({ name: 'SCHEDULER' })

const Base = join(
  config.root_path,
  'build',
  'application',
  'queue',
  'tasks',
  'periodic'
)

Promise.config({
  cancellation: true
})

export default function run() {
  return Promise.resolve()
    .then(loadInitializer)
    .then(requireTask)
    .catch(fatalErrorHandler('SCHEDULER'))

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

    if (!R.is(Function, Task.expression)) {
      throw new Error(
        `Invalid task ${File}. Tasks should have a static method 'expression'.`
      )
    }

    if (!R.is(Function, Task.handler)) {
      throw new Error(
        `Invalid task ${File}. Tasks should have a static method 'handler'.`
      )
    }

    if (Task.type() !== 'periodic') {
      return Logger.info(
        `Task ${Task.name} not runned because the 'type' is not 'periodic'.`
      )
    }

    if (!Cron.validate(Task.expression())) {
      throw new Error(`Invalid task ${File}. Task expression is invalid.`)
    }

    Logger.info(`Initializing job for ${File}.`)

    Logger.info(
      `${Task.name} loaded successfully with expression '${Task.expression()}'.`
    )

    const Job = Cron.schedule(
      Task.expression(),
      () => {
        if (!TaskEnabled) {
          Logger.info(`Task ${Task.name} not runned because was disabled.`)
          return null
        }

        Logger.info(`Starting task ${Task.name}.`)

        return Promise.resolve()
          .then(execute)
          .catch(errorHandler)

        function execute() {
          return Task.handler()
        }

        function errorHandler(err) {
          Logger.error(`An error has occurred on ${Task.name}.`)
          Logger.error(err)

          captureError(
            err,
            {
              logger: 'SCHEDULER',
              level: 'error',
              taskName: Task.name,
              captured_on: 'requireTask'
            },
            true
          )
        }
      },
      {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      }
    )

    return Job.start()
  }
}

// Graceful Shutdown
R.forEach(signal => {
  process.on(signal, shutdownHandler(signal, Signals[signal]))
}, R.keys(Signals))
