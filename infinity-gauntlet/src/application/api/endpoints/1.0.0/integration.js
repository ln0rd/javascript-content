import Promise from 'bluebird'
import IntegrationService from 'application/core/services/integration'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class IntegrationEndpoint {
  static children(req, res) {
    return Promise.resolve()
      .then(getChildrenIntegrationRequests)
      .then(respond)

    function getChildrenIntegrationRequests() {
      return IntegrationService.getChildrenIntegrationRequests(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static childrenCredentials(req, res) {
    return Promise.resolve()
      .then(getChildrenIntegrationCredentials)
      .then(respond)

    function getChildrenIntegrationCredentials() {
      return IntegrationService.getChildrenIntegrationCredentials(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updateChildCredential(req, res) {
    return Promise.resolve()
      .then(updateChildCredential)
      .then(respond)

    function updateChildCredential() {
      return IntegrationService.updateChildCredential(
        req.get('locale'),
        req.params.childId,
        req.get('company').id,
        req.params.credentialId,
        req.body
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deleteChildCredential(req, res) {
    return Promise.resolve()
      .then(deleteChildCredential)
      .then(respond)

    function deleteChildCredential() {
      return IntegrationService.deleteChildCredential(
        req.get('locale'),
        req.params.childId,
        req.get('company').id,
        req.params.credentialId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createChild(req, res) {
    return Promise.resolve()
      .then(createChildCredential)
      .then(respond)

    function createChildCredential() {
      return IntegrationService.createChildCredential(
        req.get('locale'),
        req.body,
        req.get('company').id,
        req.params.childId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static create(req, res) {
    return Promise.resolve()
      .then(createCredential)
      .then(respond)

    function createCredential() {
      return IntegrationService.createCredential(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static process(req, res) {
    return Promise.resolve()
      .then(processRequest)
      .then(respond)

    function processRequest() {
      return IntegrationService.processRequest(
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
