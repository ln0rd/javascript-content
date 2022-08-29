import EventService from 'application/core/services/event'

export default class EventEndpoint {
  static getSource(req, res) {
    return EventService.getSource(req.get('locale'), req.query).then(response =>
      res.json(200, response)
    )
  }

  static createSource(req, res) {
    return EventService.createSource(req.get('locale'), req.body).then(
      response => res.json(200, response)
    )
  }

  static updateSource(req, res) {
    return EventService.updateSource(
      req.get('locale'),
      req.body,
      req.params.eventSourceId
    ).then(response => res.json(200, response))
  }

  static deleteSource(req, res) {
    return EventService.deleteSource(
      req.get('locale'),
      req.params.eventSourceId
    ).then(response => res.json(200, response))
  }

  static getHandler(req, res) {
    return EventService.getHandler(req.get('locale'), req.query).then(
      response => res.json(200, response)
    )
  }

  static createHandler(req, res) {
    return EventService.createHandler(req.get('locale'), req.body).then(
      response => res.json(200, response)
    )
  }

  static updateHandler(req, res) {
    return EventService.updateHandler(
      req.get('locale'),
      req.body,
      req.params.eventHandlerId
    ).then(response => res.json(200, response))
  }

  static deleteHandler(req, res) {
    return EventService.deleteHandler(
      req.get('locale'),
      req.params.eventHandlerId
    ).then(response => res.json(200, response))
  }
}
