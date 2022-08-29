import Promise from 'bluebird'
import R from 'ramda'
import createLogger from 'framework/core/adapters/logger'
import PortfolioService from 'application/core/services/portfolio'
import Portfolio from 'application/core/models/portfolio'
import Company from 'application/core/models/company'
import User from 'application/core/models/user'
import mongoose from 'mongoose'

const Logger = createLogger({ name: 'CREATE_INITIAL_PORTFOLIOS_TASK' })

export default class CreateInitialPortfolios {
  static type() {
    return 'manual'
  }

  static handler(args) {
    const context = {}

    return Promise.resolve(context)
      .then(parseAndAssocArgs(args))
      .then(readOldHierarchy)
      .then(fetchAndAssocUsers)
      .then(fetchAndAssocMerchantsWithoutPortfolio)
      .then(createPortfolios)

    function parseAndAssocArgs(args) {
      return function(context) {
        if (args.length !== 2) {
          throw new Error(
            'Invalid arguments. args[0] is the hierarchy file path; args[1] is the client company id'
          )
        }
        const parsedArgs = {
          hierarchyFilePath: args[0],
          clientId: args[1]
        }
        return R.assoc('parsedArgs', parsedArgs, context)
      }
    }
    /**
     * Reads the JSON file at path.
     * This JSON file must be in the following format:
     *
     * [ <user-id>, [ <company-id] ]
     * @param {} path
     */
    function readOldHierarchy(context) {
      const { parsedArgs } = context
      const { hierarchyFilePath } = parsedArgs

      const fs = require('fs')
      const oldHierarchy = JSON.parse(
        fs.readFileSync(hierarchyFilePath, 'utf8')
      )

      return R.assoc('oldHierarchy', oldHierarchy, context)
    }

    async function fetchAndAssocUsers(context) {
      const { oldHierarchy } = context

      const userIds = oldHierarchy
        /* eslint-disable no-unused-vars */
        .filter(([_, merchantIds]) => merchantIds.length > 0)
        .map(([user_id]) => mongoose.Types.ObjectId(user_id))

      /* TODO: validate if user is from company
      const clientCompany = await Company.findOne({
        _id: mongoose.Types.ObjectId(clientId)
      })
        .lean()
        .exec();
      const wrongUserIds = userIds.filter(
        userId => !clientCompany.users.includes(userId)
      )

      if (wrongUserIds.length > 0) {
        let err = new Error('oldHierarchy has invalid users.')
        Logger.error(
          `${wrongUserIds.length} NOT IN client company. clientId=${clientId}`
        )

        Logger.debug('Wrong ids: ' + wrongUserIds.join(','))
        throw err
      }
      */

      const validUserIds = userIds
        //.filter(userId => clientCompany.users.includes(userId))
        .map(userId => mongoose.Types.ObjectId(userId))

      const validUsers = await User.find(
        {
          _id: { $in: validUserIds }
        },
        '_id name email'
      )
        .lean()
        .exec()

      /**
       * If the lengths are different, that means some users are NOT inside the users collection
       */
      if (validUserIds.length !== validUsers.length) {
        Logger.error('oldHierarchy has unexisting users')
        throw new Error('User not found. Check the hierarchyfile')
      }

      const usersById = Object.assign(
        ...validUsers.map(user => ({ [user._id]: user }))
      )

      return R.assoc('usersById', usersById, context)
    }

    async function fetchAndAssocMerchantsWithoutPortfolio(context) {
      const { oldHierarchy } = context

      const merchantIds = R.flatten(
        /* eslint-disable no-unused-vars */
        oldHierarchy.map(([_, merchantIds]) => merchantIds)
      ).map(merchantId => mongoose.Types.ObjectId(merchantId))

      const merchants = await Company.find(
        {
          _id: { $in: merchantIds },
          portfolio: { $exists: false }
        },
        '_id name'
      )
        .lean()
        .exec()
      let merchantsWithoutPortfolio
      if (merchants.length === 0) {
        merchantsWithoutPortfolio = {}
      } else {
        merchantsWithoutPortfolio = Object.assign(
          ...merchants.map(m => ({ [m._id]: m }))
        )
      }
      return R.assoc(
        'merchantsWithoutPortfolio',
        merchantsWithoutPortfolio,
        context
      )
    }

    /**
     * For merchants without portfolio assign a portfolio owned by the given userId
     * Create portfolio if user does not have one
     * @param {} context
     */
    async function createPortfolios(context) {
      const { oldHierarchy, merchantsWithoutPortfolio, parsedArgs } = context
      const { clientId } = parsedArgs

      for (let i = 0; i < oldHierarchy.length; i++) {
        const [userId, merchantIds] = oldHierarchy[i]
        const merchants = merchantIds
          .map(mid => merchantsWithoutPortfolio[mid])
          .filter(v => !!v)

        if (merchants.length === 0) {
          Logger.debug(
            `SKIPPING: UserId=${userId} because it has no merchants without portfolios`
          )
          continue
        }
        Logger.debug(
          `Assigning a portfolio owned by userId=${userId} for ${
            merchants.length
          } merchants`
        )

        /* eslint-disable no-await-in-loop */
        const portfolio = await getOrCreateUserPortfolio(userId, context)

        for (let j = 0; j < merchants.length; j++) {
          const merchantId = merchants[j]._id
          Logger.debug(
            `transferMerchant: merchantId=${merchantId} destinationPortfolioId=${
              portfolio._id
            }. userId=${userId} clientId=${clientId}`
          )
          try {
            await PortfolioService.transferMerchant({
              merchantId,
              clientId,
              destinationPortfolioId: portfolio._id
            })
          } catch (err) {
            Logger.error(
              {
                err,
                context: {
                  merchantId,
                  clientId,
                  destinationPortfolioId: portfolio._id
                }
              },
              'failed to transferMerchant'
            )
            throw err
          }
        }
      }
    }
  }
}

async function getOrCreateUserPortfolio(userId, context) {
  let portfolio
  const { usersById, parsedArgs } = context
  const { clientId } = parsedArgs

  const user = usersById[userId]

  portfolio = await Portfolio.findOne({
    'owner.id': mongoose.Types.ObjectId(userId)
  })
  if (portfolio) {
    return portfolio
  }

  Logger.debug(`Creating portfolio for userId=${userId}`)
  portfolio = await PortfolioService.create({
    name: 'Meu Portfolio',
    owner: {
      _id: mongoose.Types.ObjectId(userId),
      name: user.name,
      email: user.email
    },
    clientId
  })

  return portfolio
}

/**
 * Clean portfolios:
 db.companies.updateMany({ portfolio: { $exists: true } }, {
   $unset: { portfolio: "" }
 })
 */
