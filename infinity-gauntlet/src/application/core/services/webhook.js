import R from 'ramda'
import Promise from 'bluebird'
import {
  webHookEventResponder,
  webHookDeliveryResponder
} from 'application/core/responders/webhook'
import { translate } from 'framework/core/adapters/i18n'
import WebHookEvent from 'application/webhook/models/event'
import { validate } from 'framework/core/adapters/validator'
import { paginate } from 'application/core/helpers/pagination'
import WebHookDelivery from 'application/webhook/models/delivery'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import EventAlreadyDelivered from 'framework/core/errors/event-already-delivered-error'
import { resendWebHook } from 'application/webhook/helpers/deliverer'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'WEBHOOK_SERVICE'
})

export default class WebHookService {
  static getEvents(locale, params, companyId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(get)
      .then(respond)

    function formatQuery() {
      const Query = {
        company_id: companyId,
        /* 
         * This filter removes from the result the duplicated events on the collection, that were marked 
         * with deleted as true. And also keeps in the result the events that doesn`t have the deleted field.
         */
        $or: [
          {
            deleted: {
              $exists: false
            }
          },
          {
            deleted: false
          }
        ]
      }

      return R.merge(
        Query,
        R.pick(
          ['name', 'model', 'model_id', 'delivered'],
          R.reject(v => {
            if (R.isNil(v)) {
              return true
            }
            if (R.isEmpty(v)) {
              return true
            }
          }, params)
        )
      )
    }

    function get(query) {
      return paginate(
        locale,
        WebHookEvent,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        webHookEventResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getEvent(locale, eventId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkEvent)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_webhook_event', { id: eventId })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return WebHookEvent.findOne({
        _id: eventId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkEvent(event) {
      if (!event) {
        throw new ModelNotFoundError(
          locale,
          translate('models.webhook_event', locale)
        )
      }
    }

    function respond(event) {
      return webHookEventResponder(event)
    }
  }

  /** Method responsible to redeliver events.
   *
   * - Events that are already previously delivered will return an error instead.
   * - Requires the event id to be valid
   * - Requires the event to exist and to be pending (delivered == false) or if delivered param is true
   *
   * @param locale - the logged user locale
   * @param eventId - the event to be redelivered
   * @param companyId - the logged user companyId
   * @param delivered - the conditional field to send an event already sent
   * @returns Promise<WebHookEvent>
   */
  static redeliverEvent(locale, eventId, companyId, delivered = false) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkEvent)
      .then(redeliver)
      .then(webHookEventResponder)
      .catch(error => {
        Logger.error({ error, eventId, companyId }, 'redeliverer-event')
        throw error
      })

    function checkParams() {
      const Errors = validate('request_webhook_event', { id: eventId })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return WebHookEvent.findOne({
        _id: eventId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkEvent(event) {
      if (!event) {
        throw new ModelNotFoundError(
          locale,
          translate('models.webhook_event', locale)
        )
      }

      if (!delivered && event.delivered) {
        throw new EventAlreadyDelivered(locale)
      }
    }

    function redeliver(event) {
      return resendWebHook(event)
    }
  }

  static getDeliveries(locale, params, eventId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(getEvent)
      .tap(checkEvent)
      .then(formatQuery)
      .then(get)
      .then(respond)

    function checkParams() {
      const Errors = validate(
        'request_webhook_deliveries',
        R.merge({ id: eventId }, params),
        {
          useCoerce: true
        }
      )

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getEvent() {
      return WebHookEvent.findOne({
        _id: eventId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkEvent(event) {
      if (!event) {
        throw new ModelNotFoundError(
          locale,
          translate('models.webhook_event', locale)
        )
      }
    }

    function formatQuery() {
      const Query = {
        event_id: eventId
      }

      return R.merge(
        Query,
        R.pick(
          ['event', 'status_code', 'status_text'],
          R.reject(v => {
            if (R.isNil(v)) {
              return true
            }
            if (R.isEmpty(v)) {
              return true
            }
          }, params)
        )
      )
    }

    function get(query) {
      return paginate(
        locale,
        WebHookDelivery,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        webHookDeliveryResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getDelivery(locale, eventId, deliveryId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(getEvent)
      .tap(checkEvent)
      .then(getDelivery)
      .tap(checkDelivery)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_webhook_delivery', {
        event_id: eventId,
        id: deliveryId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getEvent() {
      return WebHookEvent.findOne({
        _id: eventId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkEvent(event) {
      if (!event) {
        throw new ModelNotFoundError(
          locale,
          translate('models.webhook_event', locale)
        )
      }
    }

    function getDelivery() {
      return WebHookDelivery.findOne({
        _id: deliveryId,
        event_id: eventId
      })
        .lean()
        .exec()
    }

    function checkDelivery(delivery) {
      if (!delivery) {
        throw new ModelNotFoundError(
          locale,
          translate('models.webhook_delivery', locale)
        )
      }
    }

    function respond(delivery) {
      return webHookDeliveryResponder(delivery)
    }
  }
}
