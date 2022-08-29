import Promise from 'bluebird'
import UtilService from 'application/core/services/util'

export default class ZipCodeEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getZipcode)
      .then(respond)

    function getZipcode() {
      return UtilService.getZipCode(req.get('locale'), req.params.zipcode)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
