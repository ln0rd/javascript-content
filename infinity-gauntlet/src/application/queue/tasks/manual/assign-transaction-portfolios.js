import Promise from 'bluebird'
import R from 'ramda'
import createLogger from 'framework/core/adapters/logger'
import Portfolio from 'application/core/models/portfolio'
import Company from 'application/core/models/company'
import Transaction from 'application/core/models/transaction'
import mongoose from 'mongoose'

const Logger = createLogger({ name: 'ASSIGN_TRANSACTION_PORTFOLIOS_TASK' })

export default class AssignTransactionPortfolios {
  static type() {
    return 'manual'
  }

  static handler(args) {
    const context = {}

    return Promise.resolve(context)
      .then(parseAndAssocArgs(args))
      .then(fetchAndAssocPortfoliosWithMerchants)
      .then(assignPortfolioToTransactions)

    function parseAndAssocArgs(args) {
      return function(context) {
        if (args.length !== 1) {
          throw new Error('Invalid arguments. args[0] is the client company id')
        }
        const parsedArgs = {
          clientId: args[0]
        }
        return R.assoc('parsedArgs', parsedArgs, context)
      }
    }

    async function fetchAndAssocPortfoliosWithMerchants(context) {
      const { parsedArgs } = context
      const { clientId } = parsedArgs

      const merchants = await Company.find(
        {
          parent_id: mongoose.Types.ObjectId(clientId),
          portfolio: { $exists: true }
        },
        '_id portfolio'
      )
      const merchantsByPortfolio = R.groupBy(function(merchant) {
        return merchant.portfolio.toString()
      })(merchants)

      const portfolioIds = merchants.map(({ portfolio }) =>
        mongoose.Types.ObjectId(portfolio)
      )
      const portfolios = await Portfolio.find(
        { _id: { $in: portfolioIds } },
        '_id owner'
      )
        .lean()
        .exec()
        .map(p =>
          R.assoc(
            'merchantIds',
            merchantsByPortfolio[p._id.toString()].map(R.prop('_id')),
            p
          )
        )

      return R.assoc('portfolios', portfolios, context)
    }

    async function assignPortfolioToTransactions(context) {
      const { portfolios } = context

      for (let i = 0; i < portfolios.length; i++) {
        const portfolio = portfolios[i]

        // must be string not ObjectId
        const merchantIds = portfolio.merchantIds.map(id => id.toString())
        Logger.debug(
          { portfolio },
          `Assigning portfolioId=${portfolio._id} to transactions...`
        )

        /* eslint-disable no-await-in-loop */
        const result = await Transaction.updateMany(
          {
            portfolio: { $exists: false },
            status: 'paid',
            company_id: { $in: merchantIds }
          },
          {
            $set: {
              portfolio: portfolio
            }
          }
        )
        Logger.debug({ result }, 'Assignment ended.')
      }
    }
  }
}
