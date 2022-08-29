import Promise from 'bluebird'
import HashboardService from 'application/core/services/hashboard'

export default class HashboardEndpoint {
  static getHashboard(req, res) {
    return Promise.resolve()
      .then(getHashboard)
      .then(respond)

    function getHashboard() {
      return HashboardService.getHashboard(
        req.get('locale'),
        req.query.hashboardId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createHashboard(req, res) {
    return Promise.resolve()
      .then(createHashboard)
      .then(respond)

    function createHashboard() {
      return HashboardService.createHashboard(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deleteHashboard(req, res) {
    return Promise.resolve()
      .then(deleteHashboard)
      .then(respond)

    function deleteHashboard() {
      return HashboardService.deleteHashboard(
        req.get('locale'),
        req.params.hashboardId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updateHashboard(req, res) {
    return Promise.resolve()
      .then(updateHashboard)
      .then(respond)

    function updateHashboard() {
      return HashboardService.updateHashboard(
        req.get('locale'),
        req.body,
        req.params.hashboardId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static addUrl(req, res) {
    return Promise.resolve()
      .then(addNewUrl)
      .then(respond)

    function addNewUrl() {
      return HashboardService.addUrl(
        req.get('locale'),
        req.params.hashboardId,
        req.body
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getHashboardConfiguration(req, res) {
    return Promise.resolve()
      .then(getHashboardConfig)
      .then(respond)

    function getHashboardConfig() {
      return HashboardService.getConfiguration(
        req.get('locale'),
        req.headers.host
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createDeployment(req, res) {
    return Promise.resolve()
      .then(createDeployment)
      .then(respond)

    function createDeployment() {
      return HashboardService.createDeployment(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updateDeployment(req, res) {
    return Promise.resolve()
      .then(updateDeployment)
      .then(respond)

    function updateDeployment() {
      return HashboardService.updateDeployment(
        req.get('locale'),
        req.body,
        req.params.deploymentId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deleteDeployment(req, res) {
    return Promise.resolve()
      .then(deleteDeployment)
      .then(respond)

    function deleteDeployment() {
      return HashboardService.deleteDeployment(
        req.get('locale'),
        req.params.deploymentId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getDeployment(req, res) {
    return Promise.resolve()
      .then(getDeployment)
      .then(respond)

    function getDeployment() {
      return HashboardService.getDeployment(
        req.get('locale'),
        req.query.deploymentId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static updateDistribution(req, res) {
    return Promise.resolve()
      .then(updateDistribution)
      .then(respond)

    function updateDistribution() {
      return HashboardService.updateDistribution(
        req.get('locale'),
        req.body,
        req.params.distributionId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static deleteDistribution(req, res) {
    return Promise.resolve()
      .then(deleteDistribution)
      .then(respond)

    function deleteDistribution() {
      return HashboardService.deleteDistribution(
        req.get('locale'),
        req.params.distributionId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getDistribution(req, res) {
    return Promise.resolve()
      .then(getDistribution)
      .then(respond)

    function getDistribution() {
      return HashboardService.getDistribution(
        req.get('locale'),
        req.query.distributionId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static createDistribution(req, res) {
    return Promise.resolve()
      .then(createDistribution)
      .then(respond)

    function createDistribution() {
      return HashboardService.createDistribution(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static clearCache(req, res) {
    return Promise.resolve()
      .then(invalidateCache)
      .then(respond)

    function invalidateCache() {
      return HashboardService.invalidateCache(req.get('locale'), req.query)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static hashboardConf(req, res) {
    const auth = req.get('company') ? true : false
    return HashboardService.getConfigFile(req.get('locale'), req.headers, auth)
      .then(config => res.send(200, config))
      .catch(error => res.send(404, error.message))
  }
}
