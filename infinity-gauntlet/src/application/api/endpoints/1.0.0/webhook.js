import Promise from 'bluebird'
import WebHookService from 'application/core/services/webhook'
import { paginatedResults } from 'application/core/helpers/pagination'
import { pathOr } from 'ramda'

export default class WebHookEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getEvent)
      .then(respond)

    function getEvent() {
      return WebHookService.getEvent(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  /** Route responsible to redeliver events. Events that are already previously
   * delivered will return an error instead.
   *
   * @param req - the request containing the logged user information and the event id
   * @param res - the event model
   * @returns Promise<WebHookEvent>
   */
  static redeliver(req, res) {
    return Promise.resolve()
      .then(redeliverEvent)
      .then(respond)

    function redeliverEvent() {
      return WebHookService.redeliverEvent(
        req.get('locale'),
        req.params.id,
        req.get('company').id,
        pathOr(false, ['body', 'delivered'], req)
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static all(req, res) {
    return Promise.resolve()
      .then(getEvents)
      .then(respond)

    function getEvents() {
      return WebHookService.getEvents(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static delivery(req, res) {
    return Promise.resolve()
      .then(getDelivery)
      .then(respond)

    function getDelivery() {
      return WebHookService.getDelivery(
        req.get('locale'),
        req.params.id,
        req.params.delivery_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deliveries(req, res) {
    return Promise.resolve()
      .then(getDeliveries)
      .then(respond)

    function getDeliveries() {
      return WebHookService.getDeliveries(
        req.get('locale'),
        req.query,
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }
}
