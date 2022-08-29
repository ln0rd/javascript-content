import Promise from 'bluebird'
import AppKeyService from 'application/core/services/app-key'

export default class AppKeyEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getAppKeys)
      .then(respond)

    function getAppKeys() {
      return AppKeyService.getAppKeys(req.get('locale'), req.get('company').id)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static create(req, res) {
    return Promise.resolve()
      .then(createAppKey)
      .then(respond)

    function createAppKey() {
      return AppKeyService.createAppKey(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static remove(req, res) {
    return Promise.resolve()
      .then(removeAppKey)
      .then(respond)

    function removeAppKey() {
      return AppKeyService.revokeAppKey(
        req.get('locale'),
        req.params,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
