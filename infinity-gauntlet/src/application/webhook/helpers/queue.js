import R from 'ramda'
import Promise from 'bluebird'
import { channel } from 'framework/core/adapters/queue'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'WEBHOOK_QUEUE_HELPER' })

export function publishWebHook(content = Buffer.from('')) {
  const Name = 'WebHook'
  const ExchangeName = `${Name}Exchange`
  const QueueName = `${Name}Queue`
  const baseContext = {
    taskName: Name,
    queueName: QueueName,
    exchangeName: ExchangeName
  }

  return Promise.bind()
    .then(declareExchange)
    .then(declareQueue)
    .then(bindQueue)
    .then(publishToExchange)

  async function declareExchange() {
    Logger.debug(baseContext, 'publish-webhook-trying-declare-exchange')

    try {
      const exchange = await channel.assertExchange(ExchangeName, 'fanout', {
        durable: true,
        autoDelete: false
      })

      Logger.debug(
        baseContext,
        'publish-webhook-exchange-declared-successfully'
      )

      return exchange
    } catch (error) {
      Logger.error(
        { error, baseContext },
        'publish-webhook-exchange-declared-error'
      )
      throw error
    }
  }

  async function declareQueue() {
    Logger.debug(baseContext, 'publish-webhook-trying-declare-queue')

    try {
      const queue = await channel.assertQueue(QueueName, {
        durable: true,
        exclusive: false,
        autoDelete: false
      })

      Logger.debug(baseContext, 'publish-webhook-queue-declared-successfully')

      return queue
    } catch (error) {
      Logger.error(
        { error, baseContext },
        'publish-webhook-queue-declared-error'
      )
      throw error
    }
  }

  async function bindQueue() {
    Logger.debug(baseContext, 'publish-webhook-trying-bind-queue-with-exchange')

    try {
      const bindQueue = await channel.bindQueue(QueueName, ExchangeName, '#')

      Logger.debug(
        baseContext,
        'publish-webhook-queue-bound-to-exchange-successfully'
      )

      return bindQueue
    } catch (error) {
      Logger.error(
        { error, baseContext },
        'publish-webhook-queue-bound-to-exchange-error'
      )
      throw error
    }
  }

  async function publishToExchange() {
    Logger.debug(baseContext, 'publish-webhook-message-publishing')

    try {
      const publish = await channel.publish(ExchangeName, QueueName, content, {
        persistent: true,
        mandatory: false,
        immediate: false,
        contentType: 'application/json'
      })

      Logger.debug(baseContext, 'publish-webhook-message-published')

      return publish
    } catch (error) {
      Logger.error({ error, baseContext }, 'publish-webhook-message-error')
      throw error
    }
  }
}

export function consumeWebHookQueue(cb) {
  const MaxRetries = 120
  const Expiration = 3600000 // 1 hour

  const Name = 'WebHook'
  const ExchangeName = `${Name}Exchange`
  const QueueName = `${Name}Queue`
  const WaitingRoomExchangeName = `${Name}WaitingRoomExchange.${Expiration}`
  const WaitingRoomQueueName = `${Name}WaitingRoomQueue.${Expiration}`
  const baseContext = {
    taskName: Name,
    queueName: QueueName,
    exchangeName: ExchangeName,
    waitingRoomQueueName: WaitingRoomQueueName,
    waitingRoomExchangeName: WaitingRoomExchangeName
  }

  return Promise.bind(this)
    .then(declarePrimaryExchange)
    .then(declarePrimaryQueue)
    .then(bindPrimaryQueue)
    .then(declareWaitingRoomExchange)
    .then(declareWaitingRoomQueue)
    .then(bindWaitingRoomQueue)
    .then(consume)
    .catch(onError)

  function onError(err) {
    Logger.error(err, 'consume-webhook-queue-error')
    throw err
  }

  async function declarePrimaryExchange() {
    const options = { durable: true, autoDelete: false }

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-trying-declare-exchange'
    )

    const exchange = await channel.assertExchange(
      ExchangeName,
      'fanout',
      options
    )

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-exchange-declared-successfully'
    )

    return exchange
  }

  async function declarePrimaryQueue() {
    const options = {
      durable: true,
      exclusive: false,
      autoDelete: false
    }

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-trying-declare-queue'
    )

    const queue = await channel.assertQueue(QueueName, options)

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-queue-declared-successfully'
    )

    return queue
  }

  async function bindPrimaryQueue() {
    Logger.debug(
      baseContext,
      'consume-webhook-queue-trying-bind-queue-with-exchange'
    )

    const bindQueue = await channel.bindQueue(QueueName, ExchangeName, '#')

    Logger.debug(
      baseContext,
      'consume-webhook-queue-queue-bound-to-exchange-successfully'
    )

    return bindQueue
  }

  async function declareWaitingRoomExchange() {
    const options = { durable: true, autoDelete: false }

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-trying-declare-waiting-room-exchange'
    )

    const exchange = await channel.assertExchange(
      WaitingRoomExchangeName,
      'fanout',
      options
    )

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-waiting-room-exchange-declared-successfully'
    )

    return exchange
  }

  async function declareWaitingRoomQueue() {
    const options = {
      durable: true,
      exclusive: false,
      autoDelete: false,
      deadLetterExchange: ExchangeName,
      messageTtl: Expiration
    }

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-trying-declare-waiting-room-queue'
    )

    const queue = await channel.assertQueue(WaitingRoomQueueName, options)

    Logger.debug(
      { baseContext, options },
      'consume-webhook-queue-waiting-room-queue-declared-successfully'
    )

    return queue
  }

  async function bindWaitingRoomQueue() {
    Logger.debug(
      baseContext,
      'consume-webhook-queue-trying-bind-waiting-room-queue-with-retry-exchange'
    )

    const bindQueue = await channel.bindQueue(
      WaitingRoomQueueName,
      WaitingRoomExchangeName,
      '#'
    )

    Logger.debug(
      baseContext,
      'consume-webhook-queue-waiting-room-queue-bound-to-waiting-room-exchange-successfully'
    )

    return bindQueue
  }

  function consume() {
    Logger.debug(baseContext, 'consume-webhook-queue-trying-to-consume-queue')

    return channel.consume(
      QueueName,
      function handler(msg) {
        if (!msg) {
          return Logger.warn(
            baseContext,
            'consume-webhook-queue-task-canceled-by-message-queue'
          )
        }

        if (msg.fields.redelivered) {
          Logger.warn(baseContext, 'consume-webhook-queue-task-redelivered')
        }

        if (msg.fields.consumerTag) {
          Logger.info(
            Object.assign({ consumerTag: msg.fields.consumerTag }, baseContext),
            'consume-webhook-queue-task-running'
          )
        }

        const Headers = R.pathOr({}, ['properties', 'headers'], msg)
        const RetryCount = R.pathOr(0, ['x-retry-count'], Headers)

        return Promise.bind(this)
          .tap(startingLog)
          .then(execute)
          .then(ackOnSuccess)
          .catch(errorHandler)

        function startingLog() {
          Logger.info(baseContext, 'consume-webhook-queue-task-starting')
        }

        function execute() {
          let messageContent
          try {
            messageContent = JSON.parse(msg.content)
          } catch (err) {
            err.context = {
              rawMessage: msg
            }
          }
          return cb(messageContent, RetryCount)
        }

        function ackOnSuccess() {
          Logger.info(baseContext, 'consume-webhook-queue-task-finished')

          return channel.ack(msg)
        }

        function errorHandler(err) {
          Logger.error(
            Object.assign({ err: err }, baseContext),
            'consume-webhook-queue-task-error'
          )

          channel.ack(msg)

          if (RetryCount <= MaxRetries) {
            if (RetryCount > 0) {
              Logger.warn(
                Object.assign(
                  { retryCount: RetryCount, maxRetries: MaxRetries },
                  baseContext
                ),
                'consume-webhook-queue-task-waiting-room'
              )
            }

            Logger.debug(baseContext, 'consume-webhook-queue-task-republishing')

            return channel.publish(
              WaitingRoomExchangeName,
              WaitingRoomQueueName,
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

          Logger.error(
            Object.assign({ err: err }, baseContext),
            'consume-webhook-queue-task-max-retries-exceeded'
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
