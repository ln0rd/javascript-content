import ConciliationService from 'application/core/services/conciliation'
import { paginatedResults } from 'application/core/helpers/pagination'

export default class ConciliationEndpoint {
  static getTransactions(req, res) {
    return ConciliationService.getConciliation(
      req.get('locale'),
      req.query,
      req.get('company').id,
      'sales'
    ).then(response => paginatedResults(200, res, response))
  }

  static getSettlements(req, res) {
    return ConciliationService.getConciliation(
      req.get('locale'),
      req.query,
      req.get('company').id,
      'settlements'
    ).then(response => paginatedResults(200, res, response))
  }
}
