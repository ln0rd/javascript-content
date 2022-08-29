const CommonActions = require('./CommonActions')
const Payout = require('application/core/models/payout').default

/**
 * @type {module.PayoutRepository}
 */
module.exports = class PayoutRepository extends CommonActions {
  constructor() {
    super(Payout)
  }

  /**
   *
   * @param date
   * @param companiesId
   * @return {Promise}
   */
  getPayoutsFromCompanies(date, companiesId) {
    return this.find(
      {
        company_id: { $in: companiesId },
        date,
        reason: 'normal_payment',
        status: 'paid'
      },
      {
        _id: 1,
        date: 1,
        company_id: 1,
        amount: 1,
        'destination.bank_code': 1,
        'destination.agencia': 1,
        'destination.conta': 1
      }
    )
  }
}
