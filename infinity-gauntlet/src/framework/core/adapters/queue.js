import Promise from 'bluebird'
import R from 'ramda'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import url from 'url'
import { Connection } from 'amqplib-as-promised'
import { captureError } from 'framework/core/adapters/error-reporter'

const Logger = createLogger({ name: 'QUEUE_ADAPTER' })

const amqpUrl = config.queue.rabbitmq.uri

const ParsedUrl = url.parse(amqpUrl)

export let queue = null

export let channel = null

export let queueStatus = false

// getStatus returns if rabbitmq is up + queues + connection with rabbitmq.
export function getStatus() {
  return queueStatus && Boolean(queue) && Boolean(channel)
}

// States to reconnect flow.

// delayToRetryInSeconds represent in seconds the delay/interval that we are going to
// perform these connections retries.
let delayToRetryInSeconds = config.delayToRetryInSeconds || 10

// incrementFactorForDelayAttempts represents the value in seconds that we will add every time
// we try to reconnect again.
const incrementFactorForDelayAttempts =
  config.incrementFactorForDelayAttempts || 10

// Private methods
function calculateExpiration(retryCount) {
  switch (retryCount) {
    case 1:
      return 300000 // 5 minutes
    case 2:
      return 600000 // 10 minutes
    case 3:
      return 900000 // 15 minutes
    case 4:
      return 1800000 // 30 minutes
    default:
      return 300000 // 5 minute
  }
}

function resolveRetryExchangeName(name, retryCount) {
  return `${name}RetryExchange.${calculateExpiration(retryCount)}`
}

function resolveRetryQueueName(name, retryCount) {
  return `${name}RetryQueue.${calculateExpiration(retryCount)}`
}

async function publish(channel, name, content = Buffer.from('')) {
  const ExchangeName = `${name}Exchange`
  const QueueName = `${name}Queue`
  const baseContext = {
    taskName: name,
    queueName: QueueName,
    exchangeName: ExchangeName
  }

  // Create exchange
  Logger.debug(baseContext, 'publish-message-trying-declare-exchange')
  try {
    await channel.assertExchange(ExchangeName, 'fanout', {
      durable: true,
      autoDelete: false
    })
  } catch (err) {
    Logger.error(
      Object.assign({ err }, baseContext),
      'publish-message-trying-declare-exchange-error'
    )
    throw err
  }
  Logger.debug(baseContext, 'publish-message-exchange-declared-successfully')

  // Create queue
  Logger.debug(baseContext, 'publish-message-trying-declare-queue')
  try {
    await channel.assertQueue(QueueName, {
      durable: true,
      exclusive: false,
      autoDelete: false
    })
  } catch (err) {
    Logger.error(
      Object.assign({ err }, baseContext),
      'publish-message-trying-declare-queue-error'
    )
    throw err
  }
  Logger.debug(baseContext, 'publish-message-queue-declared-successfully')

  // Bind exchange and queue
  Logger.debug(baseContext, 'publish-message-trying-bind-queue-with-exchange')
  try {
    await channel.bindQueue(QueueName, ExchangeName, '#')
  } catch (err) {
    Logger.error(
      Object.assign({ err }, baseContext),
      'publish-message-trying-bind-queue-with-exchange-error'
    )
    throw err
  }
  Logger.debug(
    baseContext,
    'publish-message-queue-bound-to-exchange-successfully'
  )

  // Publish message
  Logger.debug(baseContext, 'publish-message-message-publishing')
  let p
  try {
    p = await channel.publish(ExchangeName, QueueName, content, {
      persistent: true,
      mandatory: false,
      immediate: false,
      contentType: 'application/json'
    })
  } catch (err) {
    Logger.error(
      Object.assign({ err }, baseContext),
      'publish-message-message-publishing-error'
    )
    throw err
  }
  Logger.debug(baseContext, 'publish-message-message-published')
  return p
}

// _reconnect is a private function that we use to reconnect when there is an error
// with rabbitmq.
//
// An interesting idea that we could leave on the roadmap would be the migration to the lib
// https://www.npmjs.com/package/amqp-connection-manager that already offers these and other
// native features, for now we follow with something more "made in-house" because we want
// to have a maxRetries configuration.
function _reconnect() {
  delayToRetryInSeconds += incrementFactorForDelayAttempts

  return setTimeout(() => {
    Logger.warn({ delayToRetryInSeconds }, 'queue-try-reconnect')
    return connectQueue()
  }, delayToRetryInSeconds * 1000)
}

// Public methods
export async function connectQueue() {
  const heartbeat = config.queue.rabbitmq.heartbeat
  const conn = new Connection(`${amqpUrl}?heartbeat=${heartbeat}`)

  const baseContext = {
    servername: ParsedUrl.hostname,
    heartbeat
  }
  // Starting connection
  Logger.info(baseContext, 'queue-connecting')
  try {
    await conn.init()
  } catch (err) {
    Logger.error(Object.assign({ err }, baseContext), 'queue-connecting-error')
    Logger.warn('queue-reconnect-from-startup-connection-error')
    _reconnect()
    return
  }
  Logger.info(baseContext, 'queue-connected')
  queue = conn
  queueStatus = true

  // Listen for events
  queue.on('close', () => {
    // Healthcheck is only effective for api, see script/check-health
    // Runner applications should just close connections and exit without error
    if (
      process.env.APPLICATION_TYPE !== 'Api' &&
      process.env.APPLICATION_TYPE !== 'Runner'
    ) {
      Logger.info('job-queue-closed')
      process.exit(1)
    }

    Logger.error('queue-closed')
    queueStatus = false
    Logger.warn('queue-reconnect-from-closed-connection')
    _reconnect()
  })

  queue.on('error', err => {
    // Healthcheck is only effective for api, see script/check-health
    // Runner applications should just close connections and exit without error
    if (
      process.env.APPLICATION_TYPE !== 'Api' &&
      process.env.APPLICATION_TYPE !== 'Runner'
    ) {
      Logger.fatal({ err }, 'job-queue-error')
      process.exit(1)
    }

    queueStatus = false
    Logger.error({ err }, 'queue-error')
    Logger.warn('queue-reconnect-from-error-on-connection')
    _reconnect()
  })

  // Starting channel
  Logger.info(baseContext, 'channel-opening')
  let ch
  try {
    ch = await conn.createChannel()
  } catch (err) {
    Logger.error(Object.assign({ err }, baseContext), 'channel-opening-error')
    throw err
  }
  Logger.info(baseContext, 'channel-openned')
  channel = ch

  // from the moment we manage to connect, reset delay.
  delayToRetryInSeconds = 10

  return channel
}

export async function closeConnection() {
  if (!queueStatus) {
    return null
  }

  if (!queue) {
    return null
  }

  if (!channel) {
    return null
  }

  queueStatus = false
  const baseContext = { servername: ParsedUrl.hostname }

  // Closing channel
  Logger.info(baseContext, 'channel-closing')
  try {
    await channel.close()
  } catch (err) {
    Logger.error(Object.assign({ err }, baseContext), 'channel-closing-error')
    throw err
  }
  Logger.info(baseContext, 'channel-closed')

  // Closing connection
  Logger.info(baseContext, 'queue-closing')
  try {
    await queue.close()
  } catch (err) {
    Logger.error(Object.assign({ err }, baseContext), 'queue-closing-error')
    throw err
  }
  Logger.info(baseContext, 'queue-closed')
}

export async function publishMessage(name, content = Buffer.from('')) {
  const p = await publish(channel, name, content)
  return p
}

export async function publishMessageWithConnection(
  channel,
  name,
  content = Buffer.from('')
) {
  const p = await publish(channel, name, content)
  await channel.close()
  Logger.warn('publish-message-with-connection-channel-connection-closed')
  return p
}

export function consumeQueue(name, cb) {
  const MaxRetries = 4

  const ExchangeName = `${name}Exchange`
  const QueueName = `${name}Queue`
  const baseContext = {
    taskName: name,
    queueName: QueueName,
    exchangeName: ExchangeName
  }

  return Promise.bind(this)
    .then(declarePrimaryExchange)
    .then(declarePrimaryQueue)
    .then(bindPrimaryQueue)
    .return(R.range(0, MaxRetries))
    .each(declareRetries)
    .then(consume)

  function declarePrimaryExchange() {
    Logger.debug(baseContext, 'consume-queue-trying-declare-exchange')

    const exchange = channel.assertExchange(ExchangeName, 'fanout', {
      durable: true,
      autoDelete: false
    })

    Logger.debug(baseContext, 'consume-queue-exchange-declared-successfully')

    return exchange
  }

  function declarePrimaryQueue() {
    Logger.debug(baseContext, 'consume-queue-trying-declare-queue')

    const queue = channel.assertQueue(QueueName, {
      durable: true,
      exclusive: false,
      autoDelete: false
    })

    // https://www.rabbitmq.com/tutorials/tutorial-two-javascript.html Fair dispatch
    channel.prefetch(parseInt(config.queue.rabbitmq.prefetch_count, 10))

    Logger.debug(baseContext, 'consume-queue-queue-declared-successfully')

    return queue
  }

  function bindPrimaryQueue() {
    Logger.debug(baseContext, 'consume-queue-trying-bind-queue-with-exchange')

    const bindQueue = channel.bindQueue(QueueName, ExchangeName, '#')

    Logger.debug(
      baseContext,
      'consume-queue-queue-bound-to-exchange-successfully'
    )

    return bindQueue
  }

  function declareRetries(index) {
    index = index + 1
    const RetryExchangeName = resolveRetryExchangeName(name, index)
    const RetryQueueName = resolveRetryQueueName(name, index)
    const baseRetryContext = {
      taskName: name,
      queueName: QueueName,
      exchangeName: ExchangeName,
      retryExchangeName: RetryExchangeName,
      retryQueueName: RetryQueueName
    }

    return Promise.resolve()
      .then(declareRetryExchange)
      .then(declareRetryQueue)
      .then(bindRetryQueue)

    function declareRetryExchange() {
      Logger.debug(
        baseRetryContext,
        'consume-queue-trying-declare-retry-exchange'
      )

      const exchange = channel.assertExchange(RetryExchangeName, 'fanout', {
        durable: true,
        autoDelete: false
      })

      Logger.debug(
        baseRetryContext,
        'consume-queue-retry-exchange-declared-successfully'
      )

      return exchange
    }

    function declareRetryQueue() {
      Logger.debug(baseRetryContext, 'consume-queue-trying-declare-retry-queue')

      const queue = channel.assertQueue(RetryQueueName, {
        durable: true,
        exclusive: false,
        autoDelete: false,
        deadLetterExchange: ExchangeName
      })

      Logger.debug(
        baseRetryContext,
        'consume-queue-retry-queue-declared-successfully'
      )

      return queue
    }

    function bindRetryQueue() {
      Logger.debug(
        baseRetryContext,
        'consume-queue-trying-bind-retry-queue-with-retry-exchange'
      )

      const bindQueue = channel.bindQueue(
        RetryQueueName,
        RetryExchangeName,
        '#'
      )

      Logger.debug(
        baseRetryContext,
        'consume-queue-retry-queue-bound-to-retry-exchange-successfully'
      )

      return bindQueue
    }
  }

  function consume() {
    Logger.debug(baseContext, 'consume-queue-trying-to-consume-queue')

    return channel.consume(
      QueueName,
      function handler(msg) {
        if (!msg) {
          return Logger.warn(
            baseContext,
            'consume-queue-task-canceled-by-message-queue'
          )
        }

        if (msg.fields.redelivered) {
          Logger.warn(baseContext, 'consume-queue-task-redelivered')
        }

        if (msg.fields.consumerTag) {
          Logger.info(
            Object.assign({ consumerTag: msg.fields.consumerTag }, baseContext),
            'consume-queue-task-running'
          )
        }

        return Promise.bind(this)
          .tap(startingLog)
          .then(execute)
          .then(ackOnSuccess)
          .catch(errorHandler)

        function startingLog() {
          Logger.info(baseContext, 'consume-queue-task-starting')
        }

        function execute() {
          return cb(msg.content)
        }

        function ackOnSuccess() {
          Logger.info(baseContext, 'consume-queue-task-finished')

          return channel.ack(msg)
        }

        function errorHandler(err) {
          const Headers = R.pathOr({}, ['properties', 'headers'], msg)
          const DeathHeaders = R.last(R.pathOr([], ['x-death'], Headers)) || {}

          const RetryCount = R.pathOr(0, ['x-retry-count'], Headers)
          const Expiration = err.delay || calculateExpiration(RetryCount)
          const RetryQueueName = resolveRetryQueueName(name, RetryCount)
          const RetryExchangeName = resolveRetryExchangeName(name, RetryCount)
          const baseRetryContext = {
            taskName: name,
            queueName: QueueName,
            exchangeName: ExchangeName,
            retryQueueName: RetryQueueName,
            retryExchangeName: RetryExchangeName
          }

          Logger.error(
            Object.assign(
              {
                err: err,
                isErrorRetriable: !err.__DO_NOT_RETRY__,
                retryCount: RetryCount,
                expiration: Expiration
              },
              baseContext
            ),
            'consume-queue-task-error'
          )

          channel.ack(msg)

          if (!err.__DO_NOT_RETRY__ && RetryCount <= MaxRetries) {
            if (RetryCount > 0) {
              Logger.warn(
                Object.assign(
                  { retryCount: RetryCount, maxRetries: MaxRetries },
                  baseContext
                ),
                'consume-queue-task-retry'
              )
            }

            Logger.debug(baseRetryContext, 'consume-queue-task-republishing')

            return channel.publish(
              RetryExchangeName,
              RetryQueueName,
              msg.content,
              {
                persistent: true,
                mandatory: false,
                immediate: false,
                contentType: 'application/json',
                expiration: Expiration,
                headers: {
                  'x-retry-count': RetryCount + 1
                }
              }
            )
          }

          const HttpErrorData = {}

          if (err.response) {
            HttpErrorData.response = {
              data: R.pathOr(
                'No data was returned from the request',
                ['response', 'data'],
                err
              ),
              status: R.pathOr(
                'No status was returned from the request',
                ['response', 'status'],
                err
              ),
              headers: R.pathOr(
                'No headers was returned from the request',
                ['response', 'headers'],
                err
              )
            }
          } else if (err.request) {
            HttpErrorData.request =
              'The request was made but no response was received.'
          }

          if (err.config) {
            HttpErrorData.config = err.config
          }

          return captureError(
            err,
            {
              logger: 'MESSAGE_QUEUE',
              level: 'error',
              internalMessage: `Unable to run the task ${name} of ${QueueName} after ${RetryCount} retries.`,
              queueName: DeathHeaders.queue,
              headers: Headers,
              deathHeaders: DeathHeaders,
              httpErrorData: HttpErrorData
            },
            true
          )
        }
      },
      {
        consumerTag: '',
        noLocal: false,
        noAck: false,
        exclusive: false
      }
    )
  }
}
