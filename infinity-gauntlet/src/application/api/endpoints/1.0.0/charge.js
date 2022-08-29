import Promise from 'bluebird'
import ChargeService from 'application/core/services/charge'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class ChargeEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getCharges)
      .then(respond)

    function getCharges() {
      return ChargeService.getCharges(
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
      .then(getCharge)
      .then(respond)

    function getCharge() {
      return ChargeService.getCharge(
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
      .then(getChildrenCharges)
      .then(respond)

    function getChildrenCharges() {
      return ChargeService.getChildrenCharges(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static cancelChild(req, res) {
    return Promise.resolve()
      .then(cancelChild)
      .then(respond)

    function cancelChild() {
      return ChargeService.cancelChild(
        req.get('locale'),
        req.params.charge_id,
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createChild(req, res) {
    return Promise.resolve()
      .then(createChild)
      .then(respond)

    function createChild() {
      return ChargeService.createChild(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
