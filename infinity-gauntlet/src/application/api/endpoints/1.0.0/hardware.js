import Promise from 'bluebird'
import HardwareService from 'application/core/services/hardware'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class HardwareEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getHardwares)
      .then(respond)

    function getHardwares() {
      return HardwareService.getHardwares(
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
      .then(getHardware)
      .then(respond)

    function getHardware() {
      return HardwareService.getHardware(
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
      .then(getChildrenHardwares)
      .then(respond)

    function getChildrenHardwares() {
      return HardwareService.getChildrenHardwares(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static activateSerial(req, res) {
    return Promise.resolve()
      .then(activate)
      .then(respond)

    function activate() {
      return HardwareService.activateSerial(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static disableChild(req, res) {
    return Promise.resolve()
      .then(disableChild)
      .then(respond)

    function disableChild() {
      return HardwareService.disableChild(
        req.get('locale'),
        req.params.hardware_id,
        req.params.child_id,
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
      return HardwareService.create(
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
      return HardwareService.createChild(
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
