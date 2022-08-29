import Promise from 'bluebird'
import PayableService from 'application/core/services/payable'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class PayableEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getPayables)
      .then(respond)

    function getPayables() {
      return PayableService.getPayables(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static get(req, res) {
    return Promise.resolve()
      .then(getPayable)
      .then(respond)

    function getPayable() {
      return PayableService.getPayable(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static children(req, res) {
    return Promise.resolve()
      .then(getChildrenPayables)
      .then(respond)

    function getChildrenPayables() {
      return PayableService.getChildrenPayables(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static transactionPayables(req, res) {
    return Promise.resolve()
      .then(getTransactionPayables)
      .then(respond)

    function getTransactionPayables() {
      return PayableService.getTransactionPayables(
        req.get('locale'),
        req.params.transaction_id,
        req.get('company').id,
        req.query
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
