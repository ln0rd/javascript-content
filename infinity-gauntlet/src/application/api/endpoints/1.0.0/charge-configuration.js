import Promise from 'bluebird'
import { paginatedResults } from 'application/core/helpers/pagination'
import ChargeConfigurationService from 'application/core/services/charge-configuration'

export default class ChargeConfigurationEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getChargeConfigurations)
      .then(respond)

    function getChargeConfigurations() {
      return ChargeConfigurationService.getChargeConfigurations(
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
      .then(getChargeConfiguration)
      .then(respond)

    function getChargeConfiguration() {
      return ChargeConfigurationService.getChargeConfiguration(
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
      .then(getChildrenChargeConfigurations)
      .then(respond)

    function getChildrenChargeConfigurations() {
      return ChargeConfigurationService.getChildrenChargeConfigurations(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static cancelChild(req, res) {
    return Promise.resolve()
      .then(cancelChild)
      .then(respond)

    function cancelChild() {
      return ChargeConfigurationService.cancelChild(
        req.get('locale'),
        req.params.config_id,
        req.params.child_id,
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
      return ChargeConfigurationService.createChild(
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
