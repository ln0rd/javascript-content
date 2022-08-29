import Promise from 'bluebird'
import PayinService from 'application/core/services/payin'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class PayinEndpoint {
  static getPayins(req, res) {
    return Promise.resolve()
      .then(getPayins)
      .then(respond)

    function getPayins() {
      return PayinService.getPayins(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static getChildrenPayins(req, res) {
    return Promise.resolve()
      .then(getChildrenPayins)
      .then(respond)

    function getChildrenPayins() {
      return PayinService.getChildrenPayins(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }
}
