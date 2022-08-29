import Promise from 'bluebird'
import PayoutService from 'application/core/services/payout'
import { paginatedResults } from 'application/core/helpers/pagination'
import Company from 'application/core/models/company'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'

export default class PayoutEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getPayouts)
      .then(respond)

    function getPayouts() {
      return PayoutService.getPayouts(
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
      .then(getPayout)
      .then(respond)

    function getPayout() {
      return PayoutService.getPayout(
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
      .then(getChildrenPayouts)
      .then(respond)

    function getChildrenPayouts() {
      return PayoutService.getChildrenPayouts(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static async getChild(req, res) {
    const companyId = req.params.child_id
    const payoutId = parseInt(req.params.id)
    const parentId = req.get('company').id

    const company = await Company.find({
      _id: companyId,
      parent_id: parentId
    })
      .select('_id')
      .lean()
      .exec()

    if (!company) {
      throw new CompanyNotBelongToParentError(req.get('locale'))
    }

    const payout = await PayoutService.getPayout(
      req.get('locale'),
      payoutId,
      companyId
    )

    return res.json(200, payout)
  }
}
