import Promise from 'bluebird'
import AcquirerService from 'application/core/services/acquirer'

export default class AcquirerResponseEndpoint {
  static getAllResponses(req, res) {
    return Promise.resolve()
      .then(getAllResponses)
      .then(respond)

    function getAllResponses() {
      return AcquirerService.getAllResponses(req.query)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
