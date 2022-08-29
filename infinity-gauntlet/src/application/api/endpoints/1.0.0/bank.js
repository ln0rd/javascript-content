import Promise from 'bluebird'
import BankService from 'application/core/services/bank'

export default class BankEndpoint {
  static getAll(req, res) {
    return Promise.resolve()
      .then(getBanks)
      .then(respond)

    function getBanks() {
      return BankService.getBanks()
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
