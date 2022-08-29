/* eslint-disable no-await-in-loop */
/**
 * 2020-10-06 - manual task to set transaction portfolio for transactions made
 * when company didn't have one, caused by an issue on acquisition
 *
 * More info: https://hashlab.slack.com/archives/CP69210VD/p1601658272130100
 *
 */

import Portfolio from 'application/core/models/portfolio'
import Transaction from 'application/core/models/transaction'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'MANUAL_FIX_LEO_TRANSACTION_PORTFOLIO'
})

export default class ManualFixLeoTransactionPortfolio {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    if (args[0] === '') {
      Logger.info('process-all-transactions')
    }

    let companyIds
    try {
      companyIds = await Company.find({
        parent_id: '5cf141b986642840656717f0'
      })
        .select('_id')
        .lean()
        .exec()
    } catch (err) {
      Logger.error({ err }, 'failed-query-child-companies')
      throw err
    }

    const companies = []
    companyIds.forEach(companyId => {
      companies.push(companyId._id.toString())
    })

    let qry = {}

    qry['portfolio'] = { $exists: false }
    qry['split_rules'] = { $exists: true }
    qry['$where'] = 'this.split_rules.length>0'
    qry['company_id'] = {
      $in: companies
    }

    if (args[0] !== '') {
      qry['_id'] = { $in: args }
    }

    let transactions
    try {
      transactions = await Transaction.find(qry)
        .lean()
        .exec()
    } catch (err) {
      Logger.error({ err }, 'failed-query-transactions')
      throw err
    }

    let success = 0
    let failed = 0
    let withoutPortfolio = 0
    const total = transactions.length
    for (let transaction of transactions) {
      Logger.info(
        {
          transaction: transaction._id
        },
        'processing-transaction'
      )

      const portfolio = await getPortfolio(transaction.split_rules)

      if (portfolio === undefined) {
        Logger.info({ transaction: transaction._id }, 'portfolio-not-found')
        withoutPortfolio = withoutPortfolio + 1
        continue
      }

      try {
        await Transaction.update(
          { _id: transaction._id },
          {
            $set: {
              portfolio: {
                _id: portfolio._id,
                owner: portfolio.owner
              }
            }
          }
        )

        Logger.info(
          {
            transaction: transaction._id
          },
          'transaction-updated-with-success'
        )
        success = success + 1
      } catch (err) {
        Logger.error(
          { transaction: transaction._id, err },
          'failed-update-transaction'
        )
        failed = failed + 1
      }
    }

    Logger.info(
      {
        total: total,
        success: success,
        withoutPortfolio: withoutPortfolio,
        failed: failed
      },
      'process-ended'
    )

    async function getPortfolio(split_rules) {
      let company
      for (const rule of split_rules) {
        try {
          company = await Company.findOne({
            _id: rule.company_id,
            portfolio: { $exists: true },
            company_metadata: { $exists: true }
          })
        } catch (err) {
          Logger.error(
            { company: rule.company_id, err },
            'failed-query-portfolio-company'
          )
          continue
        }

        if (company && company.company_metadata.is_loja_leo) {
          Logger.info({ company: company._id }, 'portfolio-company-found')
          break
        } else {
          company = undefined
        }
      }

      if (company === undefined) {
        Logger.warn({ split_rules: split_rules }, 'portfolio-company-not-found')
        return undefined
      }

      let portfolio
      try {
        portfolio = await Portfolio.findOne({
          _id: company.portfolio
        })
      } catch (err) {
        Logger.error({ company: company._id, err }, 'failed-query-portfolio')
        return undefined
      }

      return portfolio
    }
  }
}
