import Promise from 'bluebird'
import SettlementService from 'application/core/services/settlement'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class SettlementEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getSettlements)
      .then(respond)

    function getSettlements() {
      return SettlementService.getSettlements(
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
      .then(getSettlement)
      .then(respond)

    function getSettlement() {
      return SettlementService.getSettlement(
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
      .then(getChildrenSettlements)
      .then(respond)

    function getChildrenSettlements() {
      const user = req.get('user')
      return SettlementService.getChildrenSettlements(
        req.get('locale'),
        req.query,
        req.get('company').id,
        user ? user.id : ''
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }
}
