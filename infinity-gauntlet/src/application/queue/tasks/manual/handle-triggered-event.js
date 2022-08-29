import R from 'ramda'
import createLogger from 'framework/core/adapters/logger'
import TriggeredEvent, {
  IN_PROGRESS,
  TRIGGERED,
  FAILED_TO_HANDLE,
  FAILED,
  HANDLED
} from 'application/core/models/triggered-event'
import frameworkConfig from 'framework/core/config'
import applicationConfig from 'application/core/config'
import VersionHelper from 'application/core/helpers/version'
import {
  TriggeredEventMaxRetriesExceededError,
  TriggeredEventVersionMismatchError
} from 'application/core/errors/triggered-events-errors'
import { publishMessage } from 'framework/core/adapters/queue'
import { translate } from 'framework/core/adapters/i18n'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

const Logger = createLogger({ name: 'HANDLE_TRIGGERED_EVENT' })

export default class HandleTriggeredEventManual {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const eventId = args[0]

    try {
      const locale = frameworkConfig.core.i18n.defaultLocale
      const config = applicationConfig.events

      if (!eventId) {
        Logger.info('missing-triggered-event-id')
        return
      }

      const triggeredEvent = await TriggeredEvent.findOneAndUpdate(
        {
          _id: eventId,
          status: TRIGGERED
        },
        {
          $set: {
            status: IN_PROGRESS
          },
          $push: {
            status_history: IN_PROGRESS
          }
        },
        { new: true }
      )
        .populate('event_handler')
        .lean()
        .exec()

      if (!triggeredEvent) {
        throw new ModelNotFoundError(
          locale,
          translate('models.triggered_event', locale)
        )
      }

      if (triggeredEvent.retry_attempts > config.max_trigger_retries) {
        throw new TriggeredEventMaxRetriesExceededError(locale)
      }

      Logger.info(
        {
          triggered_event_id: eventId,
          event_handler: `${triggeredEvent.event_handler._id}`
        },
        'checking-triggered-event-handler'
      )

      const handlerPath = `application/events/handlers/${
        triggeredEvent.event_handler.handler
      }`
      // eslint-disable-next-line security/detect-non-literal-require
      const eventHandler = require(handlerPath).default

      const versionConfig = R.path(
        ['event_handler', 'version_configuration'],
        triggeredEvent
      )
      let versionError = false
      let versionMatch = ''

      if (versionConfig) {
        switch (versionConfig.version_match) {
          case 'exact':
            versionMatch = '!='
            versionError = VersionHelper.notEqual(
              versionConfig.handler_version,
              eventHandler.version()
            )
            break

          case 'not':
            versionMatch = '='
            versionError = VersionHelper.isEqual(
              versionConfig.handler_version,
              eventHandler.version()
            )
            break

          case 'minimum':
            versionMatch = '<'
            versionError = VersionHelper.greaterThan(
              versionConfig.handler_version,
              eventHandler.version()
            )
            break
        }
      }

      if (versionError) {
        throw new TriggeredEventVersionMismatchError(
          locale,
          eventHandler.version(),
          versionMatch,
          versionConfig.handler_version
        )
      }

      Logger.info(
        {
          triggered_event_id: eventId,
          event_handler: `${triggeredEvent.event_handler._id}`
        },
        'handling-triggered-event'
      )

      await eventHandler.handler(triggeredEvent).catch(err => {
        Logger.error(
          {
            err,
            event_handler: `${triggeredEvent.event_handler._id}`,
            triggered_event_id: eventId
          },
          'suppressed-triggered-event-handler-error'
        )
        return undefined
      })

      Logger.info({ eventId }, 'event-handler-succeeded')

      await TriggeredEvent.findOneAndUpdate(
        { _id: eventId, status: IN_PROGRESS },
        {
          $set: {
            status: HANDLED
          },
          $push: {
            status_history: HANDLED
          }
        },
        { new: true }
      )
        .lean()
        .exec()

      Logger.info(
        {
          triggered_event_id: eventId
        },
        'handling-triggered-event-success'
      )
    } catch (err) {
      Logger.error(
        {
          err,
          triggered_event_id: eventId
        },
        'handle-triggered-event-error'
      )

      let statusToUpdate = FAILED_TO_HANDLE

      if (err instanceof TriggeredEventMaxRetriesExceededError) {
        statusToUpdate = FAILED
      }

      const event = await TriggeredEvent.findOneAndUpdate(
        {
          _id: eventId
        },
        {
          $set: {
            status: statusToUpdate
          },
          $push: {
            status_history: statusToUpdate
          }
        },
        { new: true }
      )
        .lean()
        .exec()

      await publishMessage(
        'RetryTriggeredEvent',
        Buffer.from(
          JSON.stringify({
            event_id: event._id
          })
        )
      )
    }
  }
}
