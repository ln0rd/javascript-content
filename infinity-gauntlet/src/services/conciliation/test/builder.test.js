const test = require('ava')
const {
  applyMerchantSplitToTransaction,
  groupCompaniesWithTransactions,
  groupPayablesWithPayouts,
  groupPayablesWithTransaction,
  groupCompaniesWithPayables,
  groupTransactionWithOriginCompany,
  joinSalesData,
  joinSettlementsData
} = require('../data/builder')

const companies = [
  {
    _id: '123'
  },
  {
    _id: '312'
  }
]

const originCompanies = [
  {
    _id: '456'
  },
  {
    _id: '789'
  }
]

const transactions = [
  {
    _id: 1,
    company_id: '456',
    split_rules: [
      {
        company_id: '123'
      },
      {
        company_id: '456'
      }
    ]
  },
  {
    _id: 2,
    company_id: '456',
    split_rules: [
      {
        company_id: '312'
      },
      {
        company_id: '456'
      }
    ]
  },
  {
    _id: 3,
    company_id: '789',
    split_rules: [
      {
        company_id: '789'
      },
      {
        company_id: '645'
      }
    ]
  }
]

const payables = [
  {
    _id: 1,
    company_id: '123',
    settlement_id: 'abc',
    transaction_id: 1
  },
  {
    _id: 2,
    company_id: '123',
    settlement_id: 'abc',
    transaction_id: 1
  },
  {
    _id: 3,
    company_id: '312',
    settlement_id: 'cba',
    transaction_id: 2
  },
  {
    _id: 4,
    company_id: '645',
    settlement_id: 'qwe',
    transaction_id: 3
  }
]

const payouts = [
  {
    _id: 56,
    company_id: '645',
    date: '2019-08-26'
  },
  {
    _id: 78,
    company_id: '312',
    date: '2019-08-26'
  },
  {
    _id: 12,
    company_id: '123',
    date: '2019-08-26'
  }
]

const settlements = [
  {
    _id: 'abc',
    company_id: '123',
    date: '2019-08-26'
  },
  {
    _id: 'bca',
    company_id: '312',
    date: '2019-08-26'
  },
  {
    _id: 'qwe',
    company_id: '645',
    date: '2019-08-26'
  },
  {
    _id: 'cba',
    company_id: '312',
    date: '2019-08-26'
  }
]

test(`Test applying merchant split to transactions`, t => {
  const transactionsWithMerchantSplit = applyMerchantSplitToTransaction(
    transactions,
    'iso_id'
  )

  t.is(transactionsWithMerchantSplit[0].merchant_split.company_id, '123')
  t.is(transactionsWithMerchantSplit[1].merchant_split.company_id, '312')
})

test(`Test grouping companies with transactions`, t => {
  const transactionsWithMerchantSplit = applyMerchantSplitToTransaction(
    transactions,
    'iso_id'
  )
  const companiesGroupped = groupCompaniesWithTransactions(
    transactionsWithMerchantSplit,
    companies
  )

  t.is(companiesGroupped[0].transactions[0]._id, transactions[0]._id)
  t.is(companiesGroupped[1].transactions[0]._id, transactions[1]._id)
})

test(`Test grouping payables with payouts`, t => {
  const payablesGroupped = groupPayablesWithPayouts(
    payouts,
    settlements,
    payables
  )

  t.is(payablesGroupped[0].payout._id, 12)
  t.is(payablesGroupped[1].payout._id, 12)
  t.is(payablesGroupped[2].payout._id, 78)
  t.is(payablesGroupped[3].payout._id, 56)
})

test(`Test grouping payables with transactions`, t => {
  const payablesGroupped = groupPayablesWithTransaction(payables, transactions)

  t.is(payablesGroupped[0].transaction._id, 1)
  t.is(payablesGroupped[1].transaction._id, 1)
  t.is(payablesGroupped[2].transaction._id, 2)
  t.is(payablesGroupped[3].transaction._id, 3)
})

test(`Test grouping companies with payables`, t => {
  const companiesGroupped = groupCompaniesWithPayables(payables, companies)

  t.is(companiesGroupped[0].payables[0]._id, 1)
  t.is(companiesGroupped[0].payables[1]._id, 2)
  t.is(companiesGroupped[1].payables[0]._id, 3)
})

test(`Test grouping transactions with origin company`, t => {
  const transactionsGroupped = groupTransactionWithOriginCompany(
    originCompanies,
    transactions
  )

  t.is(transactionsGroupped[0].origin_company._id, '456')
  t.is(transactionsGroupped[1].origin_company._id, '456')
  t.is(transactionsGroupped[2].origin_company._id, '789')
})

test(`join entities to conciliate sales`, t => {
  const transactionsWithMerchantSplit = applyMerchantSplitToTransaction(
    transactions,
    'iso_id'
  )
  const dataJoined = joinSalesData(
    companies,
    payables,
    transactionsWithMerchantSplit,
    originCompanies
  )

  const companyData1 = dataJoined[0]
  t.is(companyData1._id, companies[0]._id)
  t.is(companyData1.payables[0]._id, payables[0]._id)
  t.is(companyData1.payables[0].transaction_id, transactions[0]._id)
  t.is(companyData1.payables[0].transaction._id, payables[0].transaction_id)
  t.is(companyData1.payables[0].transaction.company_id, originCompanies[0]._id)
  t.is(
    companyData1.payables[0].transaction.origin_company._id,
    originCompanies[0]._id
  )

  const companyData2 = dataJoined[1]
  t.is(companyData2._id, companies[1]._id)
  t.is(companyData2.payables[0]._id, payables[2]._id)
  t.is(companyData2.payables[0].transaction_id, transactions[1]._id)
  t.is(companyData2.payables[0].transaction._id, payables[2].transaction_id)
  t.is(companyData2.payables[0].transaction.company_id, originCompanies[0]._id)
  t.is(
    companyData2.payables[0].transaction.origin_company._id,
    originCompanies[0]._id
  )
})

test(`join entities to conciliate settlements`, t => {
  const transactionsWithMerchantSplit = applyMerchantSplitToTransaction(
    transactions,
    'iso_id'
  )
  const dataJoined = joinSettlementsData(
    companies,
    payables,
    payouts,
    settlements,
    transactionsWithMerchantSplit,
    originCompanies
  )

  const companyData1 = dataJoined[0]
  t.is(companyData1._id, companies[0]._id)
  t.is(companyData1.payables[0]._id, payables[0]._id)
  t.is(companyData1.payables[0].transaction_id, transactions[0]._id)
  t.is(companyData1.payables[0].transaction._id, payables[0].transaction_id)
  t.is(companyData1.payables[0].transaction.company_id, originCompanies[0]._id)
  t.is(
    companyData1.payables[0].transaction.origin_company._id,
    originCompanies[0]._id
  )
  t.is(companyData1.payables[0].payout._id, 12)
  t.is(companyData1.payables[0].payout.company_id, companies[0]._id)

  const companyData2 = dataJoined[1]
  t.is(companyData2._id, companies[1]._id)
  t.is(companyData2.payables[0]._id, payables[2]._id)
  t.is(companyData2.payables[0].transaction_id, transactions[1]._id)
  t.is(companyData2.payables[0].transaction._id, payables[2].transaction_id)
  t.is(companyData2.payables[0].transaction.company_id, originCompanies[0]._id)
  t.is(
    companyData2.payables[0].transaction.origin_company._id,
    originCompanies[0]._id
  )
  t.is(companyData2.payables[0].payout._id, 78)
  t.is(companyData2.payables[0].payout.company_id, companies[1]._id)
})
