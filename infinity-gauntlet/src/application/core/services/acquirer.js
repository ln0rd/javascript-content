import Promise from 'bluebird'
import R from 'ramda'
import AcquirerResponse from 'application/core/models/acquirer-response'
import { acquirerResponseResponder } from 'application/core/responders/acquirer-response'

export default class BankService {
  static getAllResponses(params) {
    return Promise.resolve()
      .then(getResponses)
      .then(respond)

    function getResponses() {
      const query = R.pick(
        ['acquirer', 'message', 'type', 'response_code', '_id'],
        params
      )

      return AcquirerResponse.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return acquirerResponseResponder(response)
    }
  }
}
