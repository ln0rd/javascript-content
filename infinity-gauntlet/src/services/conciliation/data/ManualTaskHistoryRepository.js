const CommonActions = require('./CommonActions')
const ManualTaskHistory = require('application/core/models/manual-task-history')
  .default

/**
 * @type {module.ManualTaskHistoryRepository}
 */
module.exports = class ManualTaskHistoryRepository extends CommonActions {
  constructor() {
    super(ManualTaskHistory)
  }

  /**
   * @param walletId
   * @param startDate
   * @param endDate
   * @returns {[{ transactionId, amount }]|[]}
   */
  async getDebtTransfers(walletId, startDate, endDate) {
    const compensatoryPutMoneyList = await this.find(
      {
        task: 'MANUAL_COMPENSATORY_PUT_MONEY',
        created_at: {
          $gte: startDate,
          $lt: endDate
        },
        args: { $regex: `DEBT_TRANSFER.*${walletId}` }
      },
      { args: 1 }
    )
    if (compensatoryPutMoneyList.length <= 0) {
      return []
    }

    return compensatoryPutMoneyList.map(compensatoryPutMoney => {
      const putMoneyExpression = compensatoryPutMoney.args
      const transactionMatches = /transaction\(([^)]+)\)/.exec(
        putMoneyExpression
      )

      const transactionId = parseInt(transactionMatches[1])
      const amount = parseInt(putMoneyExpression.split(':').slice(-1)[0])
      return { transactionId, amount }
    })
  }
}
