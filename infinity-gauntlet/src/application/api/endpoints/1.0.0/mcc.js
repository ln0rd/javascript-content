import Promise from 'bluebird'
import MccService from 'application/core/services/mcc'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class MccEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getMccs)
      .then(respond)

    function getMccs() {
      return MccService.getMccs(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static update(req, res) {
    return Promise.resolve()
      .then(updateMcc)
      .then(respond)

    function updateMcc() {
      return MccService.updateMcc(
        req.get('locale'),
        req.body,
        req.params.mcc_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getRegistered(req, res) {
    return Promise.resolve()
      .then(getMccs)
      .then(respond)

    function getMccs() {
      return MccService.getRegistered(req.get('locale'), req.query)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static create(req, res) {
    return Promise.resolve()
      .then(create)
      .then(respond)

    function create() {
      return MccService.create(
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
