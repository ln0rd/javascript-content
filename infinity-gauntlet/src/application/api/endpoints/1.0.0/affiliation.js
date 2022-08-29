import Promise from 'bluebird'
import { paginatedResults } from 'application/core/helpers/pagination'
import AffiliationService from 'application/core/services/affiliation'

export default class AffiliationEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getAffiliations)
      .then(respond)

    function getAffiliations() {
      return AffiliationService.getAffiliations(
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
      .then(getAffiliation)
      .then(respond)

    function getAffiliation() {
      return AffiliationService.getAffiliation(
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
      .then(getChildrenAffiliations)
      .then(respond)

    function getChildrenAffiliations() {
      return AffiliationService.getChildrenAffiliations(
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
      .then(updateAffiliation)
      .then(respond)

    function updateAffiliation() {
      return AffiliationService.updateAffiliation(
        req.get('locale'),
        req.body,
        req.params.id,
        req.get('company').id
      )
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
      return AffiliationService.create(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createChild(req, res) {
    return Promise.resolve()
      .then(createChild)
      .then(respond)

    function createChild() {
      return AffiliationService.createChild(
        req.get('locale'),
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
