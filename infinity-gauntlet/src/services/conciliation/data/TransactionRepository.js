const CommonActions = require('./CommonActions')
const Transaction = require('application/core/models/transaction').default

/**
 * @type {module.TransactionRepository}
 */
module.exports = class TransactionRepository extends CommonActions {
  constructor() {
    super(Transaction)
  }

  async getTransactionsByIds(transactionsId) {
    return this.find(
      {
        _id: { $in: transactionsId },
        provider: 'hash'
      },
      {
        _id: 1,
        split_rules: 1,
        status: 1,
        installments: 1,
        company_id: 1,
        acquirer_created_at: 1,
        updated_at: 1,
        card: 1,
        created_at: 1,
        acquirer_response_code: 1,
        payment_method: 1,
        nsu: 1
      }
    )
  }
}
