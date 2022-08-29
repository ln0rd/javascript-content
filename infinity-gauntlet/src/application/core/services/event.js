import R from 'ramda'
import Promise from 'bluebird'
import EventSource from 'application/core/models/event-source'
import EventHandler from 'application/core/models/event-handler'
import TriggeredEvent, {
  TRIGGERED,
  FAILED_TO_TRIGGER
} from 'application/core/models/triggered-event'
import Company from 'application/core/models/company'
import { eventSourceResponder } from 'application/core/responders/event-source'
import { eventHandlerResponder } from 'application/core/responders/event-handler'
import { companyEventResponder } from 'application/core/responders/company-event'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { translate } from 'framework/core/adapters/i18n'
import { publishMessage } from 'framework/core/adapters/queue'
import {
  EventSourceNotFoundError,
  EventSourceNotEnabledError
} from 'application/core/errors/event-source-errors'
import {
  EventHandlerNotFoundError,
  EventHandlerNotEnabledError
} from 'application/core/errors/event-handler-errors'
import { TriggerEventError } from 'application/core/errors/triggered-events-errors'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'

const Logger = createLogger({ name: 'EVENT_SERVICE' })
const defaultLocale = frameworkConfig.core.i18n.defaultLocale

export default class EventService {
  static getSource(locale, params) {
    return Promise.resolve()
      .then(getSource)
      .then(respond)

    function getSource() {
      const query = R.pick(['enabled', 'name', 'label'], params)

      if (R.has('id', params)) {
        query._id = params.id
      }

      Logger.info(
        { message: 'Listing event sources', query },
        'got-event-sources'
      )

      return EventSource.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return eventSourceResponder(response)
    }
  }

  static createSource(locale, params) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(createSource)
      .then(respond)

    function validateRequest() {
      const Errors = validate('request_event_source', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createSource() {
      return EventSource.create(
        R.pick(['enabled', 'name', 'label', 'description'], params)
      )
    }

    function respond(eventSource) {
      Logger.info(
        {
          message: 'Created new event source',
          id: eventSource._id,
          name: eventSource.name
        },
        'created-event-source'
      )

      return eventSourceResponder(eventSource)
    }
  }

  static updateSource(locale, params, sourceId) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(updateSource)
      .then(respond)

    function validateRequest() {
      const Errors = validate('request_event_source', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function updateSource() {
      const sourceData = R.pick(
        ['name', 'description', 'label', 'enabled'],
        params
      )

      return EventSource.findOneAndUpdate(
        { _id: sourceId },
        {
          $set: sourceData
        },
        { new: true }
      )
        .lean()
        .exec()
    }

    function respond(eventSource) {
      Logger.info(
        {
          message: 'Updated event source',
          id: eventSource._id,
          params: params
        },
        'updated-event-source'
      )

      return eventSourceResponder(eventSource, true)
    }
  }

  static deleteSource(locale, sourceId) {
    return Promise.resolve()
      .then(deleteSource)
      .then(respond)
      .catch(errorHandler)

    function deleteSource() {
      return EventSource.deleteOne({ _id: sourceId })
        .lean()
        .exec()
    }

    function respond() {
      Logger.info(
        {
          message: 'Deleted event source',
          id: sourceId
        },
        'deleted-event-source'
      )

      return {
        success: true
      }
    }

    function errorHandler(err) {
      Logger.error({ err }, 'delete-event-source-error')

      return {
        success: false
      }
    }
  }

  static getHandler(locale, params) {
    return Promise.resolve()
      .then(getHandler)
      .then(respond)

    function getHandler() {
      const query = R.pick(
        ['enabled', 'name', 'label', 'handler_type', 'handler'],
        params
      )

      if (R.has('id', params)) {
        query._id = params.id
      }

      Logger.info(
        { message: 'Listing event handlers', query },
        'got-event-handlers'
      )

      return EventHandler.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return eventHandlerResponder(response)
    }
  }

  static createHandler(locale, params) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(createHandler)
      .then(respond)

    function validateRequest() {
      const Errors = validate('create_event_handler', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function createHandler() {
      return EventHandler.create(
        R.pick(
          [
            'enabled',
            'name',
            'description',
            'label',
            'handler_type',
            'handler'
          ],
          params
        )
      )
    }

    function respond(eventHandler) {
      Logger.info(
        {
          message: 'Created new event handler',
          id: eventHandler._id,
          name: eventHandler.name,
          handler: eventHandler.handler
        },
        'created-event-handler'
      )

      return eventHandlerResponder(eventHandler)
    }
  }

  static updateHandler(locale, params, handlerId) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(updateHandler)
      .then(respond)

    function validateRequest() {
      const Errors = validate('update_event_handler', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function updateHandler() {
      const handlerData = R.pick(
        [
          'enabled',
          'name',
          'label',
          'handler_type',
          'handler',
          'version_configuration'
        ],
        params
      )

      return EventHandler.findOneAndUpdate(
        { _id: handlerId },
        {
          $set: handlerData
        },
        { new: true }
      )
        .lean()
        .exec()
    }

    function respond(eventHandler) {
      Logger.info(
        {
          message: 'Updated event handler',
          id: eventHandler._id,
          params: params
        },
        'updated-event-handler'
      )

      return eventHandlerResponder(eventHandler, true)
    }
  }

  static deleteHandler(locale, handlerId) {
    return Promise.resolve()
      .then(deleteHandler)
      .then(respond)

    function deleteHandler() {
      return EventHandler.deleteOne({ _id: handlerId })
        .lean()
        .exec()
    }

    function respond() {
      Logger.info(
        {
          message: 'Deleted event handler',
          id: handlerId
        },
        'deleted-event-handler'
      )

      return {
        success: true
      }
    }
  }

  static triggerEvent(companyId, eventSourceName, args = []) {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .then(triggerEvents)

    function getCompany() {
      return Company.findOne({ _id: companyId })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          defaultLocale,
          translate('models.company', defaultLocale)
        )
      }
    }

    function triggerEvents(company) {
      return Promise.resolve()
        .then(getEventSource)
        .tap(checkEventSource)
        .then(checkCompanyEnabledEvents)
        .then(getEventHandlers)
        .spread(checkEventHandlers)
        .then(trigger)
        .catch(errorHandler)

      function getEventSource() {
        return EventSource.findOne({ name: eventSourceName })
          .lean()
          .exec()
      }

      function checkEventSource(eventSource) {
        if (!eventSource) {
          throw new EventSourceNotFoundError(defaultLocale, eventSourceName)
        } else if (!eventSource.enabled) {
          throw new EventSourceNotEnabledError(defaultLocale, eventSourceName)
        }
      }

      function checkCompanyEnabledEvents(eventSource) {
        const registeredEvents = R.path(['registered_events'], company) || []
        const enabledEvents = registeredEvents.filter(registeredEvent => {
          return (
            registeredEvent.enabled &&
            `${registeredEvent.event_source}` === `${eventSource._id}`
          )
        })

        return enabledEvents
      }

      function getEventHandlers(enabledEvents) {
        return [
          enabledEvents,
          EventHandler.find({
            _id: { $in: enabledEvents.map(event => event.event_handler) }
          })
            .lean()
            .exec()
        ]
      }

      function checkEventHandlers(enabledEvents, eventHandlers) {
        if (enabledEvents.length === 0) {
          return []
        }

        if (eventHandlers.length === 0) {
          throw new EventHandlerNotFoundError(defaultLocale)
        }

        const enabledEventHandlers = eventHandlers.filter(
          eventHandler => eventHandler.enabled
        )

        if (enabledEventHandlers.length === 0) {
          throw new EventHandlerNotEnabledError(defaultLocale)
        }

        const sortedEvents = R.sort(R.ascend(R.prop('priority')), enabledEvents)

        return sortedEvents.reduce((events, event) => {
          let handlerIndex = enabledEventHandlers.findIndex(
            handler => `${handler._id}` === `${event.event_handler}`
          )

          if (handlerIndex > -1) {
            event.handler_version =
              // eslint-disable-next-line security/detect-object-injection
              enabledEventHandlers[
                handlerIndex
              ].version_configuration.handler_version
            events.push(event)
          }

          return events
        }, [])
      }

      function trigger(sortedEnabledEvents) {
        return Promise.map(sortedEnabledEvents, createDispatchAndUpdate, {
          concurrency: 1
        })

        function createDispatchAndUpdate(eventToTrigger) {
          let event

          return Promise.resolve()
            .then(createTriggeredEvent)
            .then(sendToQueue)
            .catch(suppressEventError)

          function createTriggeredEvent() {
            return TriggeredEvent.create({
              status: TRIGGERED,
              status_history: [TRIGGERED],
              event_handler: eventToTrigger.event_handler,
              event_source: eventToTrigger.event_source,
              handler_version: eventToTrigger.handler_version,
              triggered_company: company._id,
              args: args
            })
          }

          function sendToQueue(triggeredEvent) {
            event = triggeredEvent

            Logger.info(
              {
                id: triggeredEvent._id,
                company_id: triggeredEvent.triggered_company
              },
              'triggered-event'
            )

            return publishMessage(
              'HandleTriggeredEvent',
              Buffer.from(
                JSON.stringify({
                  event_id: triggeredEvent._id
                })
              )
            )
          }

          function suppressEventError(error) {
            Logger.error({ error, event }, 'trigger-event-suppress-error')

            /* eslint-disable promise/no-promise-in-callback */
            return Promise.resolve()
              .then(createOrUpdateEvent)
              .then(sendToRetryQueue)
              .then(suppress)
              .catch(handleError)

            function createOrUpdateEvent() {
              if (event && event._id) {
                return TriggeredEvent.findOneAndUpdate(
                  { _id: event._id },
                  {
                    $set: {
                      status: FAILED_TO_TRIGGER
                    },
                    $push: {
                      status_history: FAILED_TO_TRIGGER
                    }
                  }
                )
                  .lean()
                  .exec()
              } else {
                return TriggeredEvent.create({
                  status: FAILED_TO_TRIGGER,
                  status_history: [FAILED_TO_TRIGGER],
                  event_handler: eventToTrigger.event_handler,
                  event_source: eventToTrigger.event_source,
                  triggered_company: company._id,
                  args: args
                })
              }
            }

            function sendToRetryQueue(failedEvent) {
              return publishMessage(
                'RetryToTriggerEvent',
                Buffer.from(
                  JSON.stringify({
                    event_id: failedEvent._id
                  })
                )
              )
            }

            function suppress() {
              return undefined
            }

            function handleError(err) {
              Logger.error({ error, event }, 'trigger-event-dead-letter-error')

              return sendSlackMessage(
                `Triggered event ${
                  event._id
                } failed to trigger and to retry to trigger. This is a dead letter registry.`,
                err,
                event ? event._id : ''
              ).then(() => {
                throw err
              })
            }
          }
        }
      }

      function errorHandler(err) {
        Logger.error({ err }, 'trigger-event-error')

        if (
          err instanceof EventSourceNotFoundError ||
          err instanceof EventSourceNotEnabledError ||
          err instanceof EventHandlerNotFoundError ||
          err instanceof EventHandlerNotEnabledError
        ) {
          throw err
        } else {
          throw new TriggerEventError(defaultLocale)
        }
      }

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
  }

  static listCompanyEvents(locale, companyId, queryParams) {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .then(listEvents)
      .then(respond)

    function getCompany() {
      return Company.findOne({ _id: companyId })
        .populate({
          path: 'registered_events',
          populate: {
            path: 'event_handler event_source'
          }
        })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function listEvents(company) {
      const query = R.pick(
        ['enabled', 'priority', 'event_source', 'event_handler'],
        queryParams
      )

      if (R.has('id', queryParams)) {
        query._id = queryParams.id
      }

      Logger.info(
        {
          message: 'Listing company registered events',
          company_id: companyId,
          query
        },
        'list-company-registered-events'
      )

      if (
        R.has('registered_events', company) &&
        company.registered_events.length > 0
      ) {
        const filteredEnabledEvents = company.registered_events.filter(
          event => {
            if (Object.keys(query).length === 0) {
              return true
            } else {
              const normalizedEvent = R.project(R.keys(query), event)
              const eventMatch = R.equals(normalizedEvent[0], query)

              return eventMatch
            }
          }
        )

        return filteredEnabledEvents
      } else {
        return []
      }
    }

    function respond(response) {
      return companyEventResponder(response)
    }
  }

  static updateCompanyEvent(locale, companyId, eventId, params) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(getEventSourceAndHandler)
      .spread(checkSourceAndHandler)
      .then(getCompany)
      .tap(checkCompany)
      .then(updateEvent)
      .then(respond)

    function validateRequest() {
      const Errors = validate('update_company_event', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getEventSourceAndHandler() {
      const sourceAndHandler = []

      if (params.event_source) {
        sourceAndHandler.push(
          EventSource.findOne({ _id: params.event_source })
            .lean()
            .exec()
        )
      }

      if (params.event_handler) {
        sourceAndHandler.push(
          EventHandler.findOne({ _id: params.event_handler })
            .lean()
            .exec()
        )
      }

      return sourceAndHandler
    }

    function checkSourceAndHandler(eventSource, eventHandler) {
      if (R.has('event_handler', params) && !eventHandler) {
        throw new ModelNotFoundError(
          locale,
          translate('models.event_handler', locale)
        )
      }

      if (R.has('event_source', params) && !eventSource) {
        throw new ModelNotFoundError(
          locale,
          translate('models.event_source', locale)
        )
      }
    }

    function getCompany() {
      return Company.findOne({ _id: companyId })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function updateEvent(company) {
      let eventIndex = -1
      let newEventData

      if (R.has('registered_events', company)) {
        eventIndex = company.registered_events.findIndex(
          event => `${event._id}` === eventId
        )
      }

      if (eventIndex === -1) {
        throw new ModelNotFoundError(
          locale,
          translate('models.registered_event', locale)
        )
      }

      Logger.info(
        {
          message: 'Updating company registered event',
          company_id: companyId,
          event_id: eventId,
          params
        },
        'update-company-registered-event'
      )

      newEventData = R.pick(
        ['enabled', 'priority', 'event_source', 'event_handler'],
        params
      )

      Object.assign(company.registered_events[eventIndex], newEventData)

      return Company.findOneAndUpdate(
        { _id: companyId },
        {
          $set: {
            registered_events: company.registered_events
          }
        },
        {
          new: true
        }
      )
        .lean()
        .exec()
    }

    function respond(updatedCompany) {
      return companyEventResponder(updatedCompany.registered_events)
    }
  }

  static registerCompanyEvent(locale, companyId, params) {
    return Promise.resolve()
      .tap(validateRequest)
      .then(getEventSourceAndHandler)
      .spread(checkSourceAndHandler)
      .then(registerEvent)
      .tap(checkCompany)
      .then(respond)

    function validateRequest() {
      const Errors = validate('register_company_event', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getEventSourceAndHandler() {
      return [
        EventSource.findOne({ _id: params.event_source })
          .lean()
          .exec(),
        EventHandler.findOne({ _id: params.event_handler })
          .lean()
          .exec()
      ]
    }

    function checkSourceAndHandler(eventSource, eventHandler) {
      if (!eventHandler) {
        throw new ModelNotFoundError(
          locale,
          translate('models.event_handler', locale)
        )
      }

      if (!eventSource) {
        throw new ModelNotFoundError(
          locale,
          translate('models.event_source', locale)
        )
      }
    }

    function registerEvent() {
      Logger.info(
        {
          message: 'Registering company event',
          company_id: companyId,
          params
        },
        'register-company-event'
      )

      const newEventData = R.pick(
        ['enabled', 'priority', 'event_source', 'event_handler', 'inheritable'],
        params
      )

      return Company.findOneAndUpdate(
        { _id: companyId },
        {
          $push: {
            registered_events: newEventData
          }
        },
        {
          new: true
        }
      )
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function respond(updatedCompany) {
      return companyEventResponder(updatedCompany.registered_events)
    }
  }

  static removeCompanyEvent(locale, companyId, eventId) {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .then(removeEvent)
      .then(respond)

    function getCompany() {
      return Company.findOne({ _id: companyId })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function removeEvent(company) {
      let eventIndex = -1

      if (R.has('registered_events', company)) {
        eventIndex = company.registered_events.findIndex(
          event => `${event._id}` === eventId
        )
      }

      if (eventIndex === -1) {
        throw new ModelNotFoundError(
          locale,
          translate('models.registered_event', locale)
        )
      }

      Logger.info(
        {
          message: 'Removing company registered event',
          company_id: companyId,
          event_id: eventId
        },
        'remove-company-registered-event'
      )

      company.registered_events.splice(eventIndex, 1)

      return Company.findOneAndUpdate(
        { _id: companyId },
        {
          $set: {
            registered_events: company.registered_events
          }
        },
        {
          new: true
        }
      )
        .lean()
        .exec()
    }

    function respond(updatedCompany) {
      return companyEventResponder(updatedCompany.registered_events)
    }
  }
}
