import CompanyService from 'application/core/services/company'
import EventService from 'application/core/services/event'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class CompanyEndpoint {
  static get(req, res) {
    const user = req.get('user')

    return CompanyService.getCompany(
      req.get('locale'),
      req.get('company').id,
      user ? user.id : null
    ).then(response => res.json(200, response))
  }

  static children(req, res) {
    const user = req.get('user')

    return CompanyService.getChildrenCompanies(
      req.get('locale'),
      req.query,
      req.get('company').id,
      user ? user.id : ''
    ).then(response => paginatedResults(200, res, response))
  }

  static update(req, res) {
    return CompanyService.updateCompany(
      req.get('locale'),
      req.body,
      req.params.id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static updateChild(req, res) {
    return CompanyService.updateChildCompany(
      req.get('locale'),
      req.body,
      req.params.child_id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static updateCompanyStatus(req, res) {
    return CompanyService.updateCompanyStatus(
      req.get('locale'),
      req.body,
      req.params.id
    ).then(response => res.json(200, response))
  }

  static create(req, res) {
    return CompanyService.create(req.get('locale'), req.body).then(response =>
      res.json(200, response)
    )
  }

  static createChild(req, res) {
    return CompanyService.createChild(
      req.get('locale'),
      req.body,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static updateChildAnticipation(req, res) {
    return CompanyService.updateChildAnticipation(
      req.get('locale'),
      req.body,
      req.params.child_id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static updateAnticipation(req, res) {
    return CompanyService.updateAnticipation(
      req.get('locale'),
      req.body,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static allowEditHierarchy(req, res) {
    return CompanyService.allowEditHierarchy(
      req.get('locale'),
      req.get('user').id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static editHierarchy(req, res) {
    return CompanyService.editHierarchy(
      req.get('locale'),
      req.body,
      req.get('user').id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static cancelEditHierarchy(req, res) {
    return CompanyService.cancelEditHierarchy(
      req.get('locale'),
      req.get('user').id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static hierarchyMissingUsers(req, res) {
    return CompanyService.hierarchyMissingUsers(
      req.get('locale'),
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static listEvents(req, res) {
    return EventService.listCompanyEvents(
      req.get('locale'),
      req.get('company').id,
      req.query
    ).then(response => res.json(200, response))
  }

  static updateEvent(req, res) {
    return EventService.updateCompanyEvent(
      req.get('locale'),
      req.get('company').id,
      req.params.eventId,
      req.body
    ).then(response => res.json(200, response))
  }

  static registerEvent(req, res) {
    return EventService.registerCompanyEvent(
      req.get('locale'),
      req.get('company').id,
      req.body
    ).then(response => res.json(200, response))
  }

  static removeEvent(req, res) {
    return EventService.removeCompanyEvent(
      req.get('locale'),
      req.get('company').id,
      req.params.eventId
    ).then(response => res.json(200, response))
  }

  static publicCreateChild(req, res) {
    return CompanyService.publicCreateChild(req.get('locale'), req.body).then(
      response => res.json(200, response)
    )
  }

  static publicSearchDocumentNumberChild(req, res) {
    return CompanyService.publicSearchDocumentNumberChild(req.query).then(
      response => (response ? res.json(200) : res.json(404))
    )
  }

  static migrateChild(req, res) {
    return CompanyService.migrateChild(
      req.get('locale'),
      req.body,
      req.params.child_id,
      req.get('user').id
    ).then(response => res.json(200, response))
  }

  static listStores(req, res) {
    return CompanyService.listStores().then(response => res.json(200, response))
  }
}
