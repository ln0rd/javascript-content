import Promise from 'bluebird'
import FeeRuleService from 'application/core/services/fee-rule'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class FeeRuleEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getFeeRule)
      .then(respond)

    function getFeeRule() {
      return FeeRuleService.getFeeRule(req.get('locale'), req.get('company').id)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static children(req, res) {
    return Promise.resolve()
      .then(getChildrenFeeRules)
      .then(respond)

    function getChildrenFeeRules() {
      return FeeRuleService.getChildrenFeeRules(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static updateChild(req, res) {
    return Promise.resolve()
      .then(updateChildFeeRule)
      .then(respond)

    function updateChildFeeRule() {
      return FeeRuleService.updateChildFeeRule(
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

  static createChild(req, res) {
    return Promise.resolve()
      .then(createChild)
      .then(respond)

    function createChild() {
      return FeeRuleService.createChild(
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
