import DisputeService from 'application/core/services/dispute'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class DisputeEndpoint {
  static async all(req, res) {
    return DisputeService.getDisputes(
      req.get('locale'),
      req.query,
      req.get('company').id
    ).then(response => paginatedResults(200, res, response))
  }

  static async get(req, res) {
    return DisputeService.getDispute(
      req.get('locale'),
      req.params.id,
      req.get('company').id
    ).then(response => res.json(200, response))
  }
}
