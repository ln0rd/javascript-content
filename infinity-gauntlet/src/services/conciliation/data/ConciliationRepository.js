const CommonActions = require('./CommonActions')
const Conciliation = require('application/core/models/conciliation').default
const PayableRepository = require('./PayableRepository')
const TransactionRepository = require('./TransactionRepository')
const PayoutRepository = require('./PayoutRepository')
const SettlementRepository = require('./SettlementRepository')
const CompanyRepository = require('./CompanyRepository')
const {
  joinSalesData,
  joinSettlementsData,
  applyMerchantSplitToTransaction
} = require('./builder')

/**
 * @type {module.ConciliationRepository}
 */
module.exports = class ConciliationRepository extends CommonActions {
  constructor() {
    super(Conciliation)
    this.companyRepository = new CompanyRepository()
  }

  /**
   * Fetch all sales of ISO based on day and ID; grouping this data with: (Company + Payables + transaction)
   * @param {string} isoId
   * @param {string} date
   * @param {string|null} companyId
   * @return {Promise<Array|*>} - Array of (Company + Payables + transaction)
   */
  async loadSales(isoId, date, companyId = null) {
    let companies = []
    if (companyId) {
      const company = await this.companyRepository.findById(companyId, {
        _id: 1,
        name: 1,
        document_number: 1
      })
      companies = [company]
    } else {
      companies = await this.companyRepository.getAllMerchantsByParent(isoId)
    }
    const companiesIds = companies.map(({ _id }) => _id)

    const payables = await new PayableRepository().getPayablesByCompaniesIdAndCreatedAt(
      date,
      companiesIds
    )
    const transactionsIds = [
      ...new Set(payables.map(({ transaction_id }) => transaction_id))
    ]

    let transactions = await new TransactionRepository().getTransactionsByIds(
      transactionsIds
    )
    transactions = applyMerchantSplitToTransaction(transactions, isoId)

    const transactionCompanyIds = [
      ...new Set(transactions.map(({ company_id }) => company_id))
    ]
    const originCompanies = await this.companyRepository.findByIds(
      transactionCompanyIds,
      { _id: 1, document_number: 1 }
    )
    return joinSalesData(companies, payables, transactions, originCompanies)
  }

  /**
   * Fetch all payment of ISO based on day and ID; grouping this data with: Company + Payables + transaction + Payout
   * @param {string} isoId
   * @param {string} date
   * @param {string|null} companyId
   * @return {Promise<Array|*>} Array of (Company + Payables + transaction + Payout)
   */
  async loadSettlements(isoId, date, companyId) {
    let companies = []
    if (companyId) {
      const company = await this.companyRepository.findById(companyId, {
        _id: 1,
        name: 1,
        document_number: 1
      })
      companies = [company]
    } else {
      companies = await this.companyRepository.getAllMerchantsByParent(isoId)
    }

    const companiesIds = companies.map(({ _id }) => _id)
    const settlements = await new SettlementRepository().getSettlementsFromCompanies(
      date,
      companiesIds
    )

    const payouts = await new PayoutRepository().getPayoutsFromCompanies(
      date,
      companiesIds
    )

    const payables = await new PayableRepository().getPayableByPaymentDate(
      date,
      companiesIds
    )

    const transactionsIds = [
      ...new Set(payables.map(({ transaction_id }) => transaction_id))
    ]

    let transactions = await new TransactionRepository().getTransactionsByIds(
      transactionsIds
    )
    transactions = applyMerchantSplitToTransaction(transactions, isoId)

    const transactionCompanyIds = [
      ...new Set(transactions.map(({ company_id }) => company_id))
    ]
    const originCompanies = await this.companyRepository.findByIds(
      transactionCompanyIds,
      { _id: 1, document_number: 1 }
    )

    return joinSettlementsData(
      companies,
      payables,
      payouts,
      settlements,
      transactions,
      originCompanies
    )
  }

  /**
   * Fetch a List of conciliation from leo companies without SAP system
   * @param {String} date - conciliation date in format (YYYY-MM-DD)
   * @param {Array} types - list of conciliation types[sales, settlements] want to generate
   * @return {Promise<[Conciliation]>}
   */
  async getCompaniesWithoutSapConciliation(date, types) {
    const companiesWithoutSap = await this.companyRepository.getCompaniesWithoutSap()

    const filter = {
      company_id: { $in: companiesWithoutSap.map(({ _id }) => _id) },
      date,
      type: { $in: types }
    }
    return this.find(filter, {
      _id: 1,
      'conciliated.turnover': 1,
      company_id: 1,
      type: 1,
      date: 1
    })
  }

  async createConciliationIfNotExist(date, companyId, conciliationType) {
    let conciliation = await this.findOne(
      { type: conciliationType, date, company_id: companyId },
      { _id: 1, conciliated: 1, company_data: 1 }
    )
    if (!conciliation) {
      try {
        conciliation = await this.create({
          type: conciliationType,
          date,
          company_id: companyId,
          company_data: {
            payables: []
          },
          conciliated: {
            header: {},
            turnover: [],
            trailer: { content_length: 0 },
            sequential_file: ''
          }
        })
      } catch (err) {
        throw err
      }
    }
    return conciliation
  }
}
