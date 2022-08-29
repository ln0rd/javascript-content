/**
 * Grouping transactions in companies by merchant_id
 * @param {array} transactions
 * @param {array} companies
 * @return {array}
 */
function groupCompaniesWithTransactions(transactions, companies) {
  return companies.reduce((companyWithTransactions, company) => {
    const companyTransactions = transactions.filter(
      transaction =>
        String(transaction.merchant_split.company_id) === String(company._id)
    )
    if (companyTransactions.length <= 0) {
      return companyWithTransactions
    }

    return companyWithTransactions.concat(
      Object.assign({}, company, {
        transactions: companyTransactions
      })
    )
  }, [])
}

/**
 * Grouping origin Companies in transactions using the company_id
 * @param {array} originCompanies
 * @param {array} transactions
 * @return {array}
 */
function groupTransactionWithOriginCompany(originCompanies, transactions) {
  return transactions.reduce((transactionsWithOriginCompanies, transaction) => {
    const transactionCompany = originCompanies.find(
      company => String(company._id) === String(transaction.company_id)
    )
    if (!transactionCompany) {
      return transactionsWithOriginCompanies
    }
    return transactionsWithOriginCompanies.concat(
      Object.assign({}, transaction, {
        origin_company: transactionCompany
      })
    )
  }, [])
}

/**
 * Set Payouts in payable
 * @param {Array} payouts
 * @param {Array} settlements
 * @param {Array} payables
 */
function groupPayablesWithPayouts(payouts, settlements, payables) {
  return payables.reduce((payablesWithPayout, payable) => {
    const payableSettlement = settlements.find(
      settlement => String(settlement._id) === String(payable.settlement_id)
    )
    if (!payableSettlement) {
      return payablesWithPayout
    }
    const payablePayout = payouts.find(
      payout =>
        String(payout.date) === String(payableSettlement.date) &&
        String(payout.company_id) === String(payableSettlement.company_id)
    )
    if (!payablePayout) {
      return payablesWithPayout.concat(payable)
    }
    return payablesWithPayout.concat(
      Object.assign({}, payable, {
        payout: payablePayout
      })
    )
  }, [])
}

/**
 * Grouping transactions in payables
 * @param {array} payables
 * @param {array} transactions
 * @return {array}
 */
function groupPayablesWithTransaction(payables, transactions) {
  return payables.map(payable => {
    const transaction = transactions.find(
      ({ _id }) => _id === payable.transaction_id
    )
    return Object.assign({}, payable, {
      transaction
    })
  })
}

/**
 * Grouping companies in payables
 * @param {array} payables
 * @param {array} companies
 * @return {array}
 */
function groupCompaniesWithPayables(payables, companies) {
  return companies.reduce((companyWithPayable, company) => {
    const companyPayables = payables.filter(
      payable => String(payable.company_id) === String(company._id)
    )
    if (companyPayables.length <= 0) {
      return companyWithPayable
    }
    return companyWithPayable.concat(
      Object.assign({}, company, {
        payables: companyPayables
      })
    )
  }, [])
}

/**
 * Added a field called `merchant_split` which is the split rule that is not from the origin company
 * @param {[Transaction]} transactions
 * @param {string} isoId
 * @return {[Transaction]}
 */
function applyMerchantSplitToTransaction(transactions, isoId) {
  return transactions.map(transaction => {
    const originCompany = transaction.company_id
    const splitRules = transaction.split_rules

    const merchantSplit =
      splitRules.find(
        ({ company_id }) => company_id !== originCompany && company_id === isoId
      ) || transaction.split_rules[0]

    return Object.assign({}, transaction, { merchant_split: merchantSplit })
  })
}

/**
 * Group (companies, payables, transactions, originCompanies) data based on ids and payment_date
 * [
 * {
 *      _id: 'company_id',
 *      payables: [
 *        {
 *          transaction: {
 *            merchant_split: {},
 *            origin_company: {}
 *          }
 *        }
 *      ]
 *    }
 * ]
 * @param companies
 * @param payables
 * @param transactions
 * @param originCompanies
 * @return {Array}
 */
function joinSalesData(companies, payables, transactions, originCompanies) {
  const transactionWithOriginCompany = groupTransactionWithOriginCompany(
    originCompanies,
    transactions
  )

  const payablesWithTransaction = groupPayablesWithTransaction(
    payables,
    transactionWithOriginCompany
  )

  return groupCompaniesWithPayables(payablesWithTransaction, companies)
}

/**
 *
 * Group (companies, payables, payouts, settlements, transactions, originCompanies) data based on ids and payment_date
 * [
 * {
 *      _id: 'company_id',
 *      payables: [
 *        {
 *          payout: {},
 *          transaction: {
 *            merchant_split: {},
 *            origin_company: {}
 *          }
 *        }
 *      ]
 *    }
 * ]
 * @param companies
 * @param payables
 * @param payouts
 * @param settlements
 * @param transactions
 * @param originCompanies
 * @return {Array}
 */
function joinSettlementsData(
  companies,
  payables,
  payouts,
  settlements,
  transactions,
  originCompanies
) {
  const payablesWithPayouts = groupPayablesWithPayouts(
    payouts,
    settlements,
    payables
  )
  const transactionsWithOriginCompany = groupTransactionWithOriginCompany(
    originCompanies,
    transactions
  )
  const payableWithTransaction = groupPayablesWithTransaction(
    payablesWithPayouts,
    transactionsWithOriginCompany
  )
  return groupCompaniesWithPayables(payableWithTransaction, companies)
}

module.exports = {
  groupPayablesWithPayouts,
  groupPayablesWithTransaction,
  groupCompaniesWithPayables,
  groupCompaniesWithTransactions,
  groupTransactionWithOriginCompany,
  applyMerchantSplitToTransaction,
  joinSalesData,
  joinSettlementsData
}
