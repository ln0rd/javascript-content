/* eslint-disable security/detect-object-injection */
import { expect } from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'

import frameworkConfig from 'framework/core/config'
import Transaction from 'application/core/models/transaction'
import CompanyService from 'application/core/services/company'
import * as pagination from 'application/core/helpers/pagination'
import TransactionService from 'application/core/services/transaction'
import PortfolioService from 'application/core/services/portfolio'

import { generateCompany, generateTransaction } from 'test/fixtures'

const CompanyServiceGetChildrenTransactions =
  CompanyService.getChildrenTransactions
const TransactionCount = Transaction.count
const PortfolioServiceGetPortfolioIds = PortfolioService.getPortfolioIds

describe('Unit => Services: Transaction', () => {
  context('getChildrenTransactions', () => {
    const generateTransactionWithCompany = company =>
      generateTransaction(null, null, null, null, null, company)

    const companies = [generateCompany(), generateCompany(), generateCompany()]
    const transactions = [
      generateTransactionWithCompany(companies[0]),
      generateTransactionWithCompany(companies[1]),
      generateTransactionWithCompany(companies[2])
    ]
    const params = {
      page: 1,
      count: 100,
      start_date: '2020-08-18',
      end_date: '2020-08-18'
    }

    let transactionFindMock

    beforeEach(function() {
      // mocks
      CompanyService.getChildrenTransactions = (
        locale,
        query,
        companyId,
        userId,
        select
      ) => {
        let resolveCompanies = companies.slice()
        if (typeof select === 'string') {
          const fields = select.split(' ')
          resolveCompanies = resolveCompanies.map(company => {
            const c = {}
            fields.map(field => {
              c[field] = company[field]
            })
            return c
          })
        }
        return Promise.resolve(resolveCompanies)
      }
      Transaction.countDocuments = () => Promise.resolve(transactions.length)
      PortfolioService.getPortfolioIds = () => Promise.resolve(null)

      transactionFindMock = sinon
        .mock(Transaction)
        .expects('find')
        .chain('exec')
    })

    afterEach(() => {
      CompanyService.getChildrenTransactions = CompanyServiceGetChildrenTransactions
      Transaction.count = TransactionCount
      PortfolioService.getPortfolioIds = PortfolioServiceGetPortfolioIds
      sinon.restore()
    })

    it('children transaction query', async () => {
      const spyPaginate = sinon.spy(pagination, 'paginate')
      transactionFindMock.resolves(transactions)
      const companyId = 'isoId'
      const userId = 'userId'

      const response = await TransactionService.getChildrenTransactions(
        frameworkConfig.core.i18n.defaultLocale,
        params,
        companyId,
        userId
      )

      const expectedQuery = {
        acquirer_created_at: {
          $gte: `${params.start_date}T00:00:00-03:00`,
          $lt: `${params.start_date}T23:59:59-03:00`
        },
        iso_id: companyId
      }

      const [, , query, , page, count, , select] = spyPaginate.args[0]

      // check paginate receive correct params
      expect(query).to.deep.equal(expectedQuery)
      expect(page).to.equal(params.page)
      expect(count).to.equal(params.count)
      expect(select).to.undefined

      // check companies names
      companies.forEach(company => {
        const transaction = response.results.find(
          trx => trx.company_id === company._id.toString()
        )
        ;[
          ['name'],
          ['parent_id'],
          ['full_name'],
          ['document_number'],
          ['document_type'],
          ['company_metadata', 'metadata'],
          ['created_at']
        ].forEach(([companyKey, trxKey]) => {
          const transactionKey = `company_${trxKey || companyKey}`
          expect(transaction[transactionKey]).not.null
          expect(transaction).to.have.property(
            transactionKey,
            company[companyKey]
          )
        })
      })
    })

    it('children transaction accept fields param', async () => {
      const spyPaginate = sinon.spy(pagination, 'paginate')
      transactionFindMock.resolves(transactions)

      const fields = 'card,amount,payment_method'
      const paramsWithField = Object.assign(params, {
        fields
      })

      await TransactionService.getChildrenTransactions(
        frameworkConfig.core.i18n.defaultLocale,
        paramsWithField,
        'companyId',
        'userId'
      )

      const [, , , , , , , select] = spyPaginate.args[0]

      // check select is passed on to paginate
      expect(select).to.equal('card amount payment_method')
    })
  })
})
