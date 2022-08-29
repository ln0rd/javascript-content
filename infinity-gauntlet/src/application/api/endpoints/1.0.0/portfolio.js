import R from 'ramda'
import Promise from 'bluebird'
import PortfolioService from 'application/core/services/portfolio'
import User from 'application/core/models/user'
import mongoose from 'mongoose'

export default class PortfolioEndpoint {
  static create(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(createPortfolio)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id,
          name: req.body.name,
          ownerId: req.body.owner_id,
          merchantIds: req.body.merchant_ids,
          viewers: req.body.viewers
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function createPortfolio(context) {
      const { parsedRequest } = context
      const {
        userId,
        clientId,
        name,
        ownerId,
        merchantIds,
        viewers
      } = parsedRequest

      return Promise.resolve()
        .then(fetchOwner)
        .then(createPortfolio)
        .then(R.assoc('portfolio', R.__, context))

      function fetchOwner() {
        if (ownerId) {
          return fetchOwnerById()
        } else {
          return fetchCurrentUserAsOwner()
        }

        function fetchOwnerById() {
          return Promise.resolve(User.findById(ownerId, '_id name email'))
        }

        function fetchCurrentUserAsOwner() {
          return Promise.resolve(
            User.findOne({ _id: mongoose.Types.ObjectId(userId) }, 'name')
          )
            .tap(throwIfUserNotFound)
            .then(({ name }) => ({ _id: userId, name }))

          function throwIfUserNotFound(user) {
            if (!user) {
              let err = new Error(`User not found for userId=${userId}`)
              err.name = 'UserDoesNotExists'
              throw err
            }
          }
        }
      }

      function createPortfolio(owner) {
        return PortfolioService.create({
          clientId,
          owner: {
            _id: owner._id,
            name: owner.name
          },
          name,
          merchantIds,
          viewers
        })
      }
    }

    function respond(res) {
      return function(context) {
        const { portfolio } = context
        const response = { portfolio }
        return res.json(201, response)
      }
    }
  }

  static edit(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(updatePortfolio)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id,
          portfolioId: req.params.portfolio_id,
          name: req.body.name,
          ownerId: req.body.owner_id,
          viewers: req.body.viewers
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function updatePortfolio(context) {
      const { parsedRequest } = context
      const {
        userId,
        clientId,
        portfolioId,
        name,
        ownerId,
        viewers
      } = parsedRequest

      return Promise.resolve()
        .then(_updatePortfolio)
        .then(R.assoc('portfolio', R.__, context))

      function _updatePortfolio() {
        return PortfolioService.edit({
          userId,
          clientId,
          portfolioId,
          name,
          ownerId,
          viewers
        })
      }
    }

    function respond(res) {
      return function(context) {
        const { portfolio } = context
        const response = { portfolio }
        return res.json(201, response)
      }
    }
  }

  static remove(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(removePortfolioIfUserHasEnoughPermission)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.params.portfolio_id) {
          let err = new Error(
            'Missing required request path parameter: portfolio_id'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          portfolioId: req.params.portfolio_id
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function removePortfolioIfUserHasEnoughPermission(context) {
      const { parsedRequest } = context
      const { portfolioId, clientId } = parsedRequest

      return PortfolioService.remove({
        portfolioId,
        clientId
      })
    }

    function respond(res) {
      return function() {
        return res.send(204)
      }
    }
  }

  static list(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(listPortfoliosUserIsAllowedToSee)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id,
          startDate: req.query.start_date,
          endDate: req.query.end_date
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function listPortfoliosUserIsAllowedToSee(context) {
      const { parsedRequest } = context
      const { clientId, userId, startDate, endDate } = parsedRequest

      return PortfolioService.list({
        clientId,
        userId,
        startDate,
        endDate
      }).then(R.assoc('portfolios', R.__, context))
    }

    function respond(res) {
      return function(context) {
        const { portfolios } = context
        const response = { data: portfolios }
        return res.json(200, response)
      }
    }
  }

  static get(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(getPortfolio)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id,
          portfolioId: req.params.portfolio_id
        }

        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function getPortfolio(context) {
      const { parsedRequest } = context
      const { clientId, userId, portfolioId } = parsedRequest

      return PortfolioService.get({
        clientId,
        userId,
        portfolioId
      }).then(R.assoc('portfolio', R.__, context))
    }

    function respond(res) {
      return function(context) {
        const { portfolio } = context
        const response = { portfolio }
        return res.json(200, response)
      }
    }
  }

  static listMerchants(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(listMerchantsUserIsAllowedToSee)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function listMerchantsUserIsAllowedToSee(context) {
      const { parsedRequest } = context
      const { clientId, userId } = parsedRequest

      return PortfolioService.listMerchants({
        clientId,
        userId
      }).then(R.assoc('merchants', R.__, context))
    }

    function respond(res) {
      return function(context) {
        const { merchants } = context
        const response = { data: merchants }
        return res.json(200, response)
      }
    }
  }

  static listPossibleOwners(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(listPossibleOwners)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error(
            'Missing required request context parameter: company'
          )
          err.name = 'InvalidRequest'
          throw err
        }

        if (!req.get('user') || !req.get('user').id) {
          let err = new Error(
            'Missing required request context parameter: user'
          )
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          userId: req.get('user').id
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function listPossibleOwners(context) {
      const { parsedRequest } = context
      const { clientId, userId } = parsedRequest

      return PortfolioService.listPossibleOwners({
        clientId,
        userId
      }).then(R.assoc('owners', R.__, context))
    }

    function respond(res) {
      return function(context) {
        const { owners } = context
        const response = { data: owners }
        return res.json(200, response)
      }
    }
  }

  static transferMerchant(req, res) {
    const context = {}

    return Promise.resolve(context)
      .tap(throwIfInvalidRequest(req))
      .then(assocParsedRequest(req))
      .then(transferMerchantIfUserHasEnoughPermission)
      .then(respond(res))

    function throwIfInvalidRequest(req) {
      return function() {
        if (!req.get('company') || !req.get('company').id) {
          let err = new Error('Missing required context parameter: company')
          err.name = 'InvalidRequest'
          throw err
        }
      }
    }

    function assocParsedRequest(req) {
      return function(context) {
        const parsedRequest = {
          clientId: req.get('company').id,
          merchantId: req.body.merchant_id,
          destinationPortfolioId: req.body.destination_portfolio_id
        }
        return R.assoc('parsedRequest', parsedRequest, context)
      }
    }

    function transferMerchantIfUserHasEnoughPermission(context) {
      const { parsedRequest } = context
      const { merchantId, destinationPortfolioId, clientId } = parsedRequest

      return PortfolioService.transferMerchant({
        merchantId,
        destinationPortfolioId,
        clientId
      })
    }

    function respond(res) {
      return function() {
        return res.send(204)
      }
    }
  }
}
