import AnticipationService from 'application/core/services/anticipation'

export default class AnticipationSimulationEndpoint {
  static simulate(req, res) {
    return AnticipationService.anticipate(
      req.get('locale'),
      req.body,
      req.get('company').id,
      true
    ).then(response => res.json(200, response))
  }

  static simulateChildren(req, res) {
    return AnticipationService.anticipateChildren(
      req.get('locale'),
      req.body,
      req.get('company').id,
      req.params.companyId,
      true
    ).then(response => res.json(200, response))
  }

  static anticipateChildren(req, res) {
    return AnticipationService.anticipateChildren(
      req.get('locale'),
      req.body,
      req.get('company').id,
      req.params.companyId,
      false
    ).then(response => res.json(200, response))
  }

  static anticipate(req, res) {
    return AnticipationService.anticipate(
      req.get('locale'),
      req.body,
      req.get('company').id,
      false
    ).then(response => res.json(200, response))
  }

  static getAnticipations(req, res) {
    return AnticipationService.getAnticipations(
      req.get('locale'),
      req.query,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static getChildrenAnticipations(req, res) {
    return AnticipationService.getChildrenAnticipations(
      req.get('locale'),
      req.query,
      req.get('company').id,
      req.params.companyId
    ).then(response => res.json(200, response))
  }

  static getSummary(req, res) {
    return AnticipationService.getSummary(
      req.get('locale'),
      req.query,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static cancelAnticipation(req, res) {
    return AnticipationService.cancelAnticipation(
      req.get('locale'),
      req.params.anticipationId,
      req.get('company').id
    ).then(response => res.json(200, response))
  }

  static cancelChildrenAnticipation(req, res) {
    return AnticipationService.cancelChildrenAnticipation(
      req.get('locale'),
      req.params.anticipationId,
      req.get('company').id,
      req.params.companyId
    ).then(response => res.json(200, response))
  }

  static getChildrenSummary(req, res) {
    return AnticipationService.getChildrenSummary(
      req.get('locale'),
      req.query,
      req.get('company').id,
      req.params.companyId
    ).then(response => res.json(200, response))
  }

  static getNextAvailableDate(req, res) {
    return AnticipationService.getNextAvailableDate().then(response =>
      res.json(200, response)
    )
  }
}
