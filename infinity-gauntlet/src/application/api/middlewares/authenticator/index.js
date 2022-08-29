import R from 'ramda'
import Promise from 'bluebird'
import jwt from 'jsonwebtoken'
import Company from 'application/core/models/company'
import ApiKey from 'application/core/models/api-key'
import createLogger from 'framework/core/adapters/logger'
import { validateUuid } from 'application/core/helpers/uuid'
import { checkPasswordV2 } from 'application/core/helpers/password'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'
import InternalServerError from 'framework/core/errors/internal-server-error'
import Configs from 'application/core/config'
import * as IdentityAuthenticator from 'application/api/middlewares/authenticator/identity-bearer-token'

export const Logger = createLogger({ name: 'AUTHENTICATOR_MIDDLEWARE' })

export function hashKey(req, res, next) {
  const HashKey = R.pathOr('', ['authorization', 'basic', 'password'], req)

  return Promise.resolve()
    .then(checkOnDatabase)
    .then(setContext)
    .then(callNext)
    .catch(errorHandler)

  function checkOnDatabase() {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)

    function getCompany() {
      Logger.debug('Searching HashKey on database.')

      return Company.findOne({ hash_key: HashKey })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        Logger.debug('HashKey was not found on database.')

        throw new UnauthenticatedError(req.get('locale'), 'hash_key')
      }

      Logger.debug('HashKey was found on database.')
    }
  }

  function setContext(company) {
    Logger.debug('Setting request context.')

    req.set('company', {
      id: company._id.toString(),
      _id: company._id.toString()
    })
    req.set('authenticationMethod', 'hash_key')
    Logger.info(
      {
        company_id: company._id.toString(),
        type: 'hash_key'
      },
      'authentication_method'
    )
  }

  function callNext() {
    Logger.debug('Authenticated from database successfully.')

    return next()
  }

  function errorHandler(err) {
    Logger.error({ err }, 'hash_key-middleware-failed')

    if (err.public) {
      return next(err)
    }

    return next(new InternalServerError(req.get('locale'), err))
  }
}

export function appKey(req, res, next) {
  const AppKey = R.pathOr('', ['authorization', 'basic', 'password'], req)

  return Promise.resolve()
    .then(checkOnDatabase)
    .then(setContext)
    .then(callNext)
    .catch(errorHandler)

  function checkOnDatabase() {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)

    function getCompany() {
      Logger.debug('Searching AppKey on database.')

      return Company.findOne({ 'app_keys.app_key': AppKey })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        Logger.debug('AppKey was not found on database.')

        throw new UnauthenticatedError(req.get('locale'), 'app_key')
      }

      Logger.debug('AppKey was found on database.')
    }
  }

  function setContext(company) {
    Logger.debug('Setting request context.')

    req.set('company', {
      id: company._id.toString(),
      _id: company._id.toString()
    })
    req.set('authenticationMethod', 'app_key')
    Logger.info(
      {
        company_id: company._id.toString(),
        type: 'app_key'
      },
      'authentication_method'
    )
  }

  function callNext() {
    Logger.debug('Authenticated from database successfully.')

    return next()
  }

  function errorHandler(err) {
    Logger.error({ err }, 'app_key-middleware-failed')

    if (err.public) {
      return next(err)
    }

    return next(new InternalServerError(req.get('locale'), err))
  }
}

export function apiKey(req, res, next, key) {
  const secret = R.pathOr('', ['authorization', 'basic', 'password'], req)

  return Promise.resolve()
    .then(checkKey)
    .then(setContext)
    .then(callNext)
    .catch(errorHandler)

  function checkKey() {
    let apiKeyData

    return Promise.resolve()
      .then(getApiKey)
      .tap(checkApiKey)
      .then(compareSecret)
      .then(validateKey)
      .then(returnKey)

    function getApiKey() {
      return ApiKey.findOne({ key: key })
        .lean()
        .exec()
    }

    function checkApiKey(apiKey) {
      if (!apiKey) {
        throw new UnauthenticatedError(req.get('locale'), 'API key')
      }

      apiKeyData = apiKey
    }

    function compareSecret(apiKey) {
      return checkPasswordV2(secret, apiKey.secret)
    }

    function validateKey(apiKeyMatch) {
      if (!apiKeyMatch) {
        throw new UnauthenticatedError(req.get('locale'), 'API key')
      }
    }

    function returnKey() {
      return apiKeyData
    }
  }

  function setContext(apiKey) {
    req.set('api_key', {
      id: apiKey._id.toString(),
      _id: apiKey._id.toString()
    })
    req.set('company', {
      id: apiKey.company.toString(),
      _id: apiKey.company.toString()
    })
    req.set('authenticationMethod', 'api_key')
    Logger.info(
      {
        company_id: apiKey.company.toString(),
        type: 'api_key'
      },
      'authentication_method'
    )
  }

  function callNext() {
    return next()
  }

  function errorHandler(err) {
    Logger.error({ err }, 'api_key-middleware-failed')

    if (err.public) {
      return next(err)
    }

    return next(new InternalServerError(req.get('locale'), err))
  }
}

export function jwtToken(req, res, next) {
  const token = R.pathOr('', ['authorization', 'basic', 'password'], req)

  function checkToken(token) {
    let decoded

    try {
      decoded = jwt.verify(token, Configs.middlewares.jwt.secret_key)
    } catch (err) {
      return errorHandler(err)
    }

    setContext(decoded)
    return next()
  }

  function setContext({ company, user }) {
    Logger.debug('Setting request context.')

    req.set('company', {
      id: company.id.toString(),
      _id: company.id.toString()
    })
    req.set('user', {
      id: user.id.toString(),
      _id: user.id.toString()
    })
    req.set('authenticationMethod', 'jwt')
    Logger.info(
      {
        company_id: company.id.toString(),
        type: 'api_key'
      },
      'authentication_method'
    )
  }

  function errorHandler(err) {
    Logger.error({ err }, 'jwt-middleware-failed')

    if (err.public) {
      return next(err)
    }

    return next(new UnauthenticatedError(req.get('locale'), err))
  }

  return checkToken(token)
}

export function authenticator(req, res, next) {
  const AuthenticationMethod = R.pathOr(
    R.pathOr('', ['authorization', 'scheme'], req),
    ['authorization', 'basic', 'username'],
    req
  )

  if (!AuthenticationMethod) {
    return next(
      new UnauthenticatedError(req.get('locale'), 'hash_key/app_key/api_key')
    )
  }

  if (AuthenticationMethod === 'jwt') {
    return jwtToken(req, res, next)
  }

  if (AuthenticationMethod === 'hash_key') {
    return hashKey(req, res, next)
  }

  if (AuthenticationMethod === 'app_key') {
    return appKey(req, res, next)
  }

  if (AuthenticationMethod === 'Bearer') {
    return IdentityAuthenticator.identityBearerToken(req, res, next)
  }

  if (validateUuid(AuthenticationMethod)) {
    return apiKey(req, res, next, AuthenticationMethod)
  }

  return next(
    new UnauthenticatedError(req.get('locale'), 'hash_key/app_key/api_key')
  )
}

export function publicOrPrivate(req, res, next) {
  const nextWrap = () => next()
  authenticator(req, res, nextWrap)
}
