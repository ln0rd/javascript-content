import Promise from 'bluebird'
import R from 'ramda'
import moment from 'moment'

import Transaction from 'application/core/models/transaction'
import Company from 'application/core/models/company'
import Payable from 'application/core/models/payable'
import CompanyService from 'application/core/services/company'
import PortfolioService from 'application/core/services/portfolio'
import WalletService from 'application/core/services/wallet'

export default class MetricsService {
  static getMetricsForDateRange(companyId, params) {
    const startDate = params.start_date
    const endDate = params.end_date

    return Promise.resolve()
      .then(getMetricsForDateRange)
      .then(appendCompanyName)

    function getMetricsForDateRange() {
      return runQuery()
    }

    function appendCompanyName(documents) {
      const companyEntries = []
      const dayEntries = []

      return Company.findOne({ _id: companyId }).then(company => {
        documents.forEach(document => {
          if (document.type === 'company') {
            document.companyId = document.companies[0]
            document.companyName = company.name
            companyEntries.push(document)
          } else {
            dayEntries.push(document)
          }
        })

        return {
          days: dayEntries,
          companiesByDay: companyEntries
        }
      })
    }

    function runQuery() {
      const pipeline = makeMatcher().concat([
        {
          $project: {
            _id: 0,
            acquirer_created_at: 1,
            amount: 1,
            company_id: 1,
            // we split each doc into two in order to aggregate by day and company
            aggregate_by: { $literal: ['day', 'company'] }
          }
        },
        {
          $unwind: { path: '$aggregate_by' }
        },
        {
          $group: {
            _id: {
              $cond: {
                if: { $eq: ['$aggregate_by', 'day'] },
                then: {
                  // first ten characters of date string are yyyy-mm-dd
                  $substrBytes: ['$acquirer_created_at', 0, 10]
                },
                else: [
                  '$company_id',
                  {
                    // first ten characters of date string are yyyy-mm-dd
                    $substrBytes: ['$acquirer_created_at', 0, 10]
                  }
                ]
              }
            },
            tpvSum: {
              $sum: '$amount'
            },
            trxCount: {
              $sum: 1
            },
            type: {
              $first: '$aggregate_by'
            },
            companies: {
              $addToSet: '$company_id'
            }
          }
        }
      ])

      return Transaction.aggregate(pipeline)

      function makeMatcher() {
        let match = {
          status: 'paid',
          company_id: companyId,
          acquirer_created_at: {}
        }

        if (startDate || endDate) {
          match.acquirer_created_at.$gte = moment(startDate).format(
            'YYYY-MM-DD'
          )
          match.acquirer_created_at.$lt = moment(endDate)
            .add(1, 'd')
            .format('YYYY-MM-DD')
        } else {
          match.acquirer_created_at = moment(new Date()).format('YYYY-MM-DD')
        }

        return [{ $match: match }]
      }
    }
  }

  static async getChildrenMetricsForDateRange(
    companyId,
    params,
    locale,
    userId
  ) {
    const startDate = params.start_date
    const endDate = params.end_date

    const [companies, portfolioIds] = await Promise.all([
      CompanyService.getChildrenCompanies(
        locale,
        R.pick(['company_query'], params),
        companyId,
        userId,
        'name'
      ),
      PortfolioService.getPortfolioIds(companyId, userId)
    ])

    let match = {
      status: 'paid',
      acquirer_created_at: {}
    }

    if (portfolioIds) {
      match['portfolio._id'] = { $in: portfolioIds }
    } else {
      match.iso_id = companyId
    }

    if (startDate || endDate) {
      match.acquirer_created_at.$gte = moment(startDate).format('YYYY-MM-DD')
      match.acquirer_created_at.$lt = moment(endDate)
        .add(1, 'd')
        .format('YYYY-MM-DD')
    } else {
      match.acquirer_created_at = moment(new Date()).format('YYYY-MM-DD')
    }

    const pipeline = [
      { $match: match },
      {
        $project: {
          _id: 0,
          acquirer_created_at: 1,
          amount: 1,
          company_id: 1,
          // we split each doc into two in order to aggregate by day and company
          aggregate_by: { $literal: ['day', 'company'] }
        }
      },
      {
        $unwind: { path: '$aggregate_by' }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$aggregate_by', 'day'] },
              then: {
                // first ten characters of date string are yyyy-mm-dd
                $substrBytes: ['$acquirer_created_at', 0, 10]
              },
              else: [
                '$company_id',
                {
                  // first ten characters of date string are yyyy-mm-dd
                  $substrBytes: ['$acquirer_created_at', 0, 10]
                }
              ]
            }
          },
          tpvSum: {
            $sum: '$amount'
          },
          trxCount: {
            $sum: 1
          },
          type: {
            $first: '$aggregate_by'
          },
          companies: {
            $addToSet: '$company_id'
          }
        }
      }
    ]

    const documents = await Transaction.aggregate(pipeline)

    const nameMapping = {}

    companies.forEach(company => {
      nameMapping[company._id.toString()] = company.name
    })

    const companyEntries = []
    const dayEntries = []
    documents.forEach(document => {
      if (document.type === 'company') {
        document.companyId = document.companies[0]
        document.companyName = nameMapping[document.companies[0]]
        companyEntries.push(document)
      } else {
        dayEntries.push(document)
      }
    })

    return {
      days: dayEntries,
      companiesByDay: companyEntries
    }
  }

  static async balance(locale, companyId) {
    const balancePromise = WalletService.getBalance(locale, companyId)
    const payablesToReceivePromise = MetricsService.getPayablesToReceive(
      companyId
    )
    const escrowedAmountPromise = MetricsService.getSumCIPEscrowedAmount(
      companyId
    )

    const [payablesToReceive, balance, escrowedAmount] = await Promise.all([
      payablesToReceivePromise,
      balancePromise,
      escrowedAmountPromise
    ])

    return {
      available_amount: balance.available_amount,
      amount_to_receive: payablesToReceive,
      escrowed_amount: escrowedAmount
    }
  }

  static async summary(locale, query, companyId) {
    const metrics = await MetricsService.getMetricsForDateRange(
      companyId,
      query
    )

    const totalTpv = metrics.days.reduce(
      ({ count, total }, { tpvSum, trxCount }) => {
        return {
          total: total + tpvSum,
          count: count + trxCount
        }
      },
      { count: 0, total: 0 }
    )

    return {
      tpv: {
        total: totalTpv,
        days: metrics.days.map(({ tpvSum, _id }) => ({
          day: _id,
          total: tpvSum
        }))
      }
    }
  }

  static async getPayablesToReceive(companyId) {
    const [{ total } = { total: 0 }] = await Payable.aggregate([
      {
        $match: {
          company_id: companyId,
          status: 'waiting_funds',
          provider: 'hash'
        }
      },
      {
        $project: {
          amount: 1,
          fee: 1,
          cost: {
            $ifNull: ['$cost', 0]
          },
          cip_escrowed_amount: {
            $ifNull: ['$cip_escrowed_amount', 0]
          }
        }
      },
      {
        $group: {
          _id: 'waiting_funds',
          total: {
            // sum (amount - fee - cost - cip_escrowed_amount)
            $sum: {
              $subtract: [
                '$amount',
                {
                  $subtract: [
                    '$fee',
                    {
                      $subtract: ['$cost', '$cip_escrowed_amount']
                    }
                  ]
                }
              ]
            }
          }
        }
      }
    ])

    return total
  }

  static async getPayablesToReceiveNextThirtyDays(_companyId, params) {
    const companyId =
      params && params.company_id ? params.company_id : _companyId
    const today = moment(new Date()).format('YYYY-MM-DD')
    const thirtyDaysLater = moment(new Date())
      .add(31, 'd') // A Hashboard por um erro do IG mostra 31 dias quando deveria ser 30
      .format('YYYY-MM-DD')

    const [{ total } = { total: 0 }] = await Payable.aggregate([
      {
        $match: {
          company_id: companyId,
          status: 'waiting_funds',
          provider: 'hash',
          payment_date: {
            $gte: today,
            $lt: thirtyDaysLater
          }
        }
      },
      {
        $project: {
          amount: 1,
          fee: 1,
          cost: {
            $ifNull: ['$cost', 0]
          }
        }
      },
      {
        $group: {
          _id: 'waiting_funds',
          total: {
            // sum (amount - fee - cost)
            $sum: {
              $subtract: [
                '$amount',
                {
                  $subtract: ['$fee', '$cost']
                }
              ]
            }
          }
        }
      }
    ])

    return { total }
  }

  static async getSumCIPEscrowedAmount(companyId) {
    const [{ total } = { total: 0 }] = await Payable.aggregate([
      {
        $match: {
          company_id: companyId,
          status: 'waiting_funds',
          provider: 'hash'
        }
      },
      {
        $project: {
          cip_escrowed_amount: {
            $ifNull: ['$cip_escrowed_amount', 0]
          }
        }
      },
      {
        $group: {
          _id: 'waiting_funds',
          total: {
            $sum: '$cip_escrowed_amount'
          }
        }
      }
    ])

    return total
  }
}
