const CommonActions = require('./CommonActions')
const Settlement = require('application/core/models/settlement').default

/**
 * @type {module.SettlementRepository}
 */
module.exports = class SettlementRepository extends CommonActions {
  constructor() {
    super(Settlement)
  }

  /**
   *
   * @param date
   * @param companiesId
   * @return {Promise}
   */
  getSettlementsFromCompanies(date, companiesId) {
    return this.find(
      {
        company_id: { $in: companiesId },
        status: 'settled',
        amount: { $gt: 0 },
        date
      },
      {
        amount: 1,
        _id: 1,
        date: 1,
        company_id: 1
      }
    )
  }
}
