const CommonActions = require('./CommonActions')
const moment = require('moment')
const Payable = require('application/core/models/payable').default

const conciliationProject = {
  transaction_id: 1,
  transaction_amount: 1,
  installment: 1,
  total_installments: 1,
  type: 1,
  owner_company_id: 1,
  origin_company_id: 1,
  company_id: 1,
  amount: 1,
  cost: 1,
  fee: 1,
  status: 1,
  payment_date: 1,
  original_payment_date: 1,
  mdr_cost: 1,
  settlement_id: 1
}

/**
 * @type {module.PayableRepository}
 */
module.exports = class PayableRepository extends CommonActions {
  constructor() {
    super(Payable)
  }

  /**
   * @param {string} date
   * @param {array} companiesId - companies id list
   * @return {Promise}
   */
  getPayablesByCompaniesIdAndCreatedAt(date, companiesId) {
    return this.find(
      {
        company_id: { $in: companiesId },
        created_at: {
          $gte: moment(date).startOf('day'),
          $lt: moment(date).endOf('day')
        }
      },
      conciliationProject
    )
  }

  /**
   *
   * @param paymentDate
   * @return {Promise}
   */
  getPayableByPaymentDate(paymentDate, companiesIds) {
    return this.find(
      {
        payment_date: paymentDate,
        company_id: { $in: companiesIds }
      },
      conciliationProject
    )
  }
}
