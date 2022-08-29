import Promise from 'bluebird'
import ApiKeyService from 'application/core/services/api-key'

export default class ApiKeyEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getApiKey)
      .then(respond)

    function getApiKey() {
      return ApiKeyService.getApiKey(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static create(req, res) {
    return Promise.resolve()
      .then(createApiKey)
      .then(respond)

    function createApiKey() {
      return ApiKeyService.createApiKey(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static update(req, res) {
    return Promise.resolve()
      .then(updateApiKey)
      .then(respond)

    function updateApiKey() {
      return ApiKeyService.updateApiKey(
        req.get('locale'),
        req.body,
        req.params.apiKeyId,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static delete(req, res) {
    return Promise.resolve()
      .then(deleteApiKey)
      .then(respond)

    function deleteApiKey() {
      return ApiKeyService.deleteApiKey(
        req.get('locale'),
        req.params.apiKeyId,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
