import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import mongoose from 'mongoose'
import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import Portfolio from 'application/core/models/portfolio'
import Transaction from 'application/core/models/transaction'
import {
  findChildren as userIdsBelowInHierarchy,
  flattenTree,
  superUserRoles
} from 'application/core/domain/hierarchy'

import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'PORTIFOLIO_SERVICE'
})

// superUsers have no filter
// Common users are allowed to see and manage users below them in the hierarchy
async function fetchOwnerIdsFilter({ userId, clientId }) {
  const user = await User.findOne(
    {
      _id: mongoose.Types.ObjectId(userId)
    },
    '_id user_metadata'
  )

  const userHasType = Boolean(
    user && user.user_metadata && user.user_metadata.type
  )
  if (!userHasType) {
    Logger.warn({ userId, clientId }, 'User without type!')
  }

  const isSuperUser =
    userHasType &&
    ['operacional', 'admin', 'financeiro'].includes(user.user_metadata.type)
  if (isSuperUser) {
    return null
  }

  const clientCompany = await Company.findOne(
    { _id: mongoose.Types.ObjectId(clientId) },
    '_id hierarchy'
  )

  // FIXME: What happens if client company has no hierarchy?
  if (!clientCompany || !clientCompany.hierarchy) {
    Logger.warn(
      { context: { userId, clientId } },
      'client company without hierarchy'
    )

    // We wont show anything, except things owned directly by user
    return [mongoose.Types.ObjectId(userId)]
  }

  let ownerIds = userIdsBelowInHierarchy(clientCompany.hierarchy.data, userId)
  ownerIds = R.flatten(ownerIds)

  ownerIds.push(mongoose.Types.ObjectId(userId))

  return ownerIds
}

/**
 * Returns { <portfolio-id}: { tpv, count } }
 */
function aggregateTransactions(portfolioIds, optionalFilters) {
  optionalFilters = optionalFilters || {}

  let $match = { 'portfolio._id': { $in: portfolioIds }, status: 'paid' }
  if (optionalFilters.startDate || optionalFilters.endDate) {
    $match.acquirer_created_at = {}
    if (optionalFilters.startDate) {
      $match.acquirer_created_at.$gte = moment(
        optionalFilters.startDate
      ).format('YYYY-MM-DD')
    }
    if (optionalFilters.endDate) {
      $match.acquirer_created_at.$lt = moment(optionalFilters.endDate).format(
        'YYYY-MM-DD'
      )
    }
  }
  return Promise.resolve(
    Transaction.aggregate([
      { $match },
      {
        $group: {
          _id: '$portfolio._id',
          tpv: { $sum: '$amount' },
          trxCount: { $sum: 1 }
        }
      }
    ])
  ).then(aggregations => {
    let aggsByPortfolioId = {}
    for (let i = 0; i < aggregations.length; i++) {
      const { _id: portfolioId, tpv, trxCount } = aggregations[i]

      aggsByPortfolioId[portfolioId] = { tpv, trx_count: trxCount }
    }

    return aggsByPortfolioId
  })
}

export default class PortfolioService {
  static async create(params) {
    const { name, owner, clientId, merchantIds, viewers } = params

    const createQuery = {
      viewers: [],
      client_id: mongoose.Types.ObjectId(clientId),
      owner,
      name
    }

    if (viewers) {
      const viewerUsers = await User.find({ _id: { $in: viewers } })
        .select('_id name email')
        .lean()
        .exec()

      createQuery.viewers = viewerUsers
    }

    return Promise.resolve(Portfolio.create(createQuery)).then(
      assignOrTransferMerchants
    )

    /**
     * If a merchant already has a portfolio
     * then transfer it to the current portfolio
     *
     * If it does not, assign it to the created portfolio
     */

    function assignOrTransferMerchants(portfolio) {
      if (!merchantIds) {
        return portfolio
      }

      const _merchantIds = merchantIds.map(id => mongoose.Types.ObjectId(id))

      return Promise.resolve(
        Company.updateMany(
          { _id: { $in: _merchantIds } },
          { $set: { portfolio: mongoose.Types.ObjectId(portfolio._id) } }
        )
      ).then(() => portfolio)
    }
  }

  static edit(params) {
    const { clientId, portfolioId } = params

    return Promise.resolve()
      .then(buildUpdateQuery(params))
      .then(executeUpdate)

    function buildUpdateQuery({ name, ownerId, viewers }) {
      return async function() {
        let updateQuery = { $set: {} }
        if (viewers) {
          const viewerUsers = await User.find({ _id: { $in: viewers } })
            .select('_id name email')
            .lean()
            .exec()

          updateQuery.$set.viewers = viewerUsers
        }
        if (name) {
          updateQuery.$set.name = name
        }

        return Promise.resolve(
          User.findById(ownerId, '_id name email')
            .lean()
            .exec()
        ).then(R.assocPath(['$set', 'owner'], R.__, updateQuery))
      }
    }

    function executeUpdate(updateQuery) {
      return Portfolio.findOneAndUpdate(
        {
          client_id: mongoose.Types.ObjectId(clientId),
          _id: mongoose.Types.ObjectId(portfolioId)
        },
        updateQuery,
        { new: true }
      )
    }
  }

  static remove(params) {
    const { portfolioId, clientId } = params

    return Promise.resolve(
      Portfolio.deleteOne({
        _id: mongoose.Types.ObjectId(portfolioId),
        client_id: mongoose.Types.ObjectId(clientId)
      })
    )
  }

  static list(params) {
    const { clientId, userId, startDate, endDate } = params

    return Promise.resolve()
      .then(() => fetchOwnerIdsFilter({ clientId, userId }))
      .then(fetchPortfolios)
      .then(populateTransactions)

    function fetchPortfolios(ownerIdsFilter) {
      let $match = {
        client_id: mongoose.Types.ObjectId(clientId)
      }
      if (ownerIdsFilter) {
        $match['owner._id'] = { $in: ownerIdsFilter }
      }

      return Promise.resolve(
        Portfolio.aggregate([
          { $match },
          // Fetch merchants
          {
            $lookup: {
              from: 'companies',
              let: { portfolio_id: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$portfolio', '$$portfolio_id'] }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    name: 1
                  }
                }
              ],
              as: 'merchants'
            }
          }
        ])
      )
    }

    function populateTransactions(portfolios) {
      const portfolioIds = portfolios.map(p => mongoose.Types.ObjectId(p._id))

      return Promise.all([
        aggregateTransactions(portfolioIds, { startDate, endDate }),
        Promise.resolve(portfolios)
      ]).spread(function(aggsByPortfolioId, portfolios) {
        return portfolios.map(p =>
          R.assoc('aggregate', aggsByPortfolioId[p._id.toString()], p)
        )
      })
    }
  }

  static get(params) {
    const { portfolioId, clientId, userId } = params

    return Promise.resolve(
      Portfolio.findOne({
        _id: mongoose.Types.ObjectId(portfolioId),
        client_id: mongoose.Types.ObjectId(clientId)
      })
        .lean()
        .exec()
    )
      .tap(assertUserHasEnoughPermission)
      .then(populateMerchants)
      .then(populateAggregations)
      .catch(returnEmptyIfOwnerInvalid)

    function assertUserHasEnoughPermission(portfolio) {
      return Promise.resolve()
        .then(() => fetchOwnerIdsFilter({ userId, clientId }))
        .tap(throwErrorIfUserDoesNotHaveEnoughPermission)

      function throwErrorIfUserDoesNotHaveEnoughPermission(ownerIdsFilter) {
        if (
          ownerIdsFilter &&
          !ownerIdsFilter.includes(portfolio.owner._id.toString())
        ) {
          Logger.warn(
            { userId, clientId, portfolio },
            'UserDoesNotHaveEnoughPermission'
          )
          let err = new Error()
          err.name = 'UserDoesNotHaveEnoughPermission'
          throw err
        }
      }
    }

    function populateMerchants(portfolio) {
      return Company.find(
        { portfolio: mongoose.Types.ObjectId(portfolio._id) },
        '_id name'
      ).then(merchants => {
        portfolio.merchants = merchants
        return portfolio
      })
    }

    function populateAggregations(portfolio) {
      const portfolioId = portfolio._id

      return aggregateTransactions([portfolioId]).then(aggsByPortfolioId => {
        const aggregate = aggsByPortfolioId[portfolioId] || {
          tpv: 0,
          count: 0
        }
        return R.assoc('aggregate', aggregate, portfolio)
      })
    }

    function returnEmptyIfOwnerInvalid(err) {
      if (err.name === 'UserDoesNotHaveEnoughPermission') {
        return null
      } else {
        throw err
      }
    }
  }

  static listPossibleOwners(params) {
    const { clientId, userId } = params

    return Promise.resolve(Company.findById(clientId, '_id users'))
      .then(filterAllowedOwnerIds)
      .then(populateUsers)

    function filterAllowedOwnerIds(company) {
      const userIds = company.users

      return fetchOwnerIdsFilter({ clientId, userId }).then(filterIfNecessary)

      function filterIfNecessary(ownerIdsFilter) {
        if (ownerIdsFilter && ownerIdsFilter.length > 0) {
          ownerIdsFilter = ownerIdsFilter.map(i => i.toString())
          return userIds.filter(uid => ownerIdsFilter.includes(uid.toString()))
        } else {
          return userIds
        }
      }
    }

    function populateUsers(userIds) {
      return Promise.resolve(
        User.find({ _id: { $in: userIds } }, '_id name email')
          .lean()
          .exec()
      )
    }
  }

  static listMerchants(params) {
    const { clientId, userId } = params

    return Promise.resolve(
      Company.find(
        { parent_id: mongoose.Types.ObjectId(clientId) },
        '_id name portfolio'
      )
        .lean()
        .exec()
    )
      .then(populatePortfolios)
      .then(filterAllowedOwnerIds)

    function populatePortfolios(merchants) {
      const portfolioIds = merchants
        .filter(({ portfolio }) => !!portfolio)
        .map(({ portfolio }) => mongoose.Types.ObjectId(portfolio))

      return Portfolio.find(
        { _id: { $in: portfolioIds } },
        '_id name owner'
      ).then(populate)

      function populate(portfolios) {
        let portfoliosById = {}
        for (let i = 0; i < portfolios.length; i++) {
          const p = portfolios[i]
          portfoliosById[p._id.toString()] = p
        }
        return merchants.map(function(m) {
          if (m.portfolio) {
            m.portfolio = portfoliosById[m.portfolio.toString()]
          }
          return m
        })
      }
    }

    function filterAllowedOwnerIds(merchants) {
      return fetchOwnerIdsFilter({ clientId, userId }).then(filterIfNecessary)

      function filterIfNecessary(ownerIdsFilter) {
        if (ownerIdsFilter && ownerIdsFilter.length > 0) {
          ownerIdsFilter = ownerIdsFilter.map(i => i.toString())
          return merchants.filter(({ portfolio }) =>
            Boolean(
              portfolio &&
                portfolio.owner &&
                portfolio.owner._id &&
                ownerIdsFilter.includes(portfolio.owner._id.toString())
            )
          )
        } else {
          return merchants
        }
      }
    }
  }

  static transferMerchant(params) {
    const operation = 'transferMerchant'
    const { merchantId, clientId, destinationPortfolioId } = params

    return Promise.resolve()
      .then(transferMerchantToDestinationPortfolio)
      .tap(merchant => {
        if (!merchant) {
          let err = new Error('Merchant not found.')
          err.name = 'TransferMerchantFailed'

          Logger.error({ err, params, operation }, 'TransferMerchantFailed')
          throw err
        }

        if (
          !merchant.portfolio ||
          /* eslint-disable eqeqeq */
          merchant.portfolio.toString() != destinationPortfolioId
        ) {
          let err = new Error('merchant.portfolio is wrong')
          err.name = 'TransferMerchantFailed'

          Logger.error(
            { err, params, merchant, operation },
            'TransferMerchantFailed'
          )
          throw err
        }
      })

    function transferMerchantToDestinationPortfolio() {
      return Promise.resolve(
        Company.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(merchantId),
            parent_id: mongoose.Types.ObjectId(clientId)
          },
          {
            $set: { portfolio: mongoose.Types.ObjectId(destinationPortfolioId) }
          },
          { new: true, upsert: false, fields: '_id name portfolio' }
        )
          .lean()
          .exec()
      )
    }
  }

  static async getPortfolioIds(companyId, userId) {
    const promises = [
      Company.findOne({ _id: companyId })
        .select('_id enabled_features hierarchy')
        .lean()
        .exec()
    ]

    if (userId) {
      promises.push(
        User.findOne({ _id: userId })
          .select('_id user_metadata permissions')
          .lean()
          .exec()
      )
    }

    const [company, user] = await Promise.all(promises)
    const portFolioEnabled =
      company.enabled_features && company.enabled_features.portfolio
    let isSuperUser = true

    if (user && user.user_metadata && user.user_metadata.type) {
      isSuperUser = superUserRoles(user).includes(user.user_metadata.type)
    }

    if (portFolioEnabled && !isSuperUser) {
      const hierarchyData = company.hierarchy && company.hierarchy.data
      let portfolioOwners = [userId]

      if (hierarchyData && hierarchyData.length) {
        portfolioOwners = portfolioOwners.concat(
          flattenTree(userIdsBelowInHierarchy(hierarchyData, userId))
        )
      }

      const portfolios = await Portfolio.find({
        $or: [
          { 'owner._id': { $in: portfolioOwners } },
          { 'viewers._id': userId }
        ]
      })
        .select('_id')
        .lean()
        .exec()

      return portfolios.map(portfolio => portfolio._id)
    }

    return null
  }
}
