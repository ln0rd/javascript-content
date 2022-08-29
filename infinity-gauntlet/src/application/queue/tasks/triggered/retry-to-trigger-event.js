import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import TriggeredEvent, {
  FAILED_TO_TRIGGER,
  FAILED,
  TRIGGERED
} from 'application/core/models/triggered-event'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { translate } from 'framework/core/adapters/i18n'
import frameworkConfig from 'framework/core/config'
import applicationConfig from 'application/core/config'
import { publishMessage } from 'framework/core/adapters/queue'
import { TriggeredEventMaxRetriesExceededError } from 'application/core/errors/triggered-events-errors'

const Logger = createLogger({ name: 'RETRY_TO_TRIGGER_EVENT' })
const locale = frameworkConfig.core.i18n.defaultLocale
const config = applicationConfig.events

export default class RetryToTriggerEvent {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    const message = JSON.parse(msg)
    const eventId = message.event_id

    Logger.info(
      {
        message: 'Retrying to trigger event',
        event_id: eventId
      },
      'retry-trigger-event'
    )

    return Promise.resolve()
      .then(getTriggeredEvent)
      .tap(checkEvent)
      .then(retryEvent)
      .catch(errorHandler)

    function getTriggeredEvent() {
      return TriggeredEvent.findOneAndUpdate(
        { _id: eventId, status: FAILED_TO_TRIGGER },
        {
          $set: {
            status: TRIGGERED
          },
          $push: {
            status_history: TRIGGERED
          },
          $inc: {
            retry_attempts: 1
          }
        },
        { new: true }
      )
        .lean()
        .exec()
    }

    function checkEvent(triggeredEvent) {
      if (!triggeredEvent) {
        throw new ModelNotFoundError(
          locale,
          translate('models.triggered_event', locale)
        )
      } else if (triggeredEvent.retry_attempts > config.max_trigger_retries) {
        throw new TriggeredEventMaxRetriesExceededError(locale)
      }
    }

    function retryEvent(triggeredEvent) {
      const timeout =
        config.revert_timeout_base ** triggeredEvent.retry_attempts

      Logger.info(`Waiting ${timeout / 1000} seconds before continuing...`)

      return Promise.resolve()
        .delay(timeout)
        .then(retryToTrigger)
        .then(updateEvent)
        .then(logSuccess)

      function retryToTrigger() {
        return publishMessage(
          'HandleTriggeredEvent',
          Buffer.from(
            JSON.stringify({
              event_id: triggeredEvent._id
            })
          )
        )
      }

      function updateEvent() {
        return TriggeredEvent.findOneAndUpdate(
          { _id: triggeredEvent._id, status: TRIGGERED },
          {
            $set: {
              retry_attempts: 0
            }
          },
          { new: true }
        )
      }

      function logSuccess(updatedEvent) {
        Logger.info(
          {
            message: 'Event successfully triggered',
            event_id: updatedEvent._id
          },
          'retry-trigger-event'
        )
      }
    }

    function errorHandler(err) {
      Logger.error({ err }, 'retry-to-trigger-event-error')

      if (err instanceof TriggeredEventMaxRetriesExceededError) {
        /*eslint-disable promise/no-promise-in-callback*/
        return updateFailedEvent(FAILED)
          .then(sendDeadLetterNotification)
          .then(throwError)
      } else {
        return updateFailedEvent(FAILED_TO_TRIGGER)
          .then(sendToRetryQueue)
          .then(throwError)
      }

      function updateFailedEvent(status) {
        return TriggeredEvent.findOneAndUpdate(
          { _id: eventId, status: TRIGGERED },
          {
            $set: {
              status: status
            },
            $push: {
              status_history: status
            }
          },
          { new: true }
        )
          .lean()
          .exec()
      }

      function sendDeadLetterNotification() {
        return sendSlackMessage(
          `Triggered event ${eventId} exceeded maximum retry to trigger attempts`,
          err,
          eventId
        )

        function sendSlackMessage(message, err, eventId) {
          let outMessage = {
            channel: 'ops',
            text: message
          }

          if (err) {
            outMessage.attachments = [
              {
                text: err.message,
                color: 'danger'
              }
            ]

            outMessage.blocks = [
              {
                type: 'section',
                text: {
                  text: message,
                  type: 'mrkdwn'
                },
                fields: [
                  {
                    type: 'mrkdwn',
                    text: '*Priority*'
                  },
                  {
                    type: 'mrkdwn',
                    text: '*Triggered Event Id*'
                  },
                  {
                    type: 'plain_text',
                    text: 'High'
                  },
                  {
                    type: 'plain_text',
                    text: eventId.toString()
                  }
                ]
              }
            ]
          }

          return publishMessage(
            'Slacker',
            Buffer.from(JSON.stringify(outMessage))
          )
        }
      }

      function sendToRetryQueue() {
        if (!(err instanceof ModelNotFoundError)) {
          return publishMessage(
            'RetryToTriggerEvent',
            Buffer.from(
              JSON.stringify({
                event_id: eventId
              })
            )
          )
        }
      }

      function throwError() {
        throw err
      }
    }
  }
}
