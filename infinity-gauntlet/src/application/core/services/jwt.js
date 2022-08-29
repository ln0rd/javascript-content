import R from 'ramda'
import jwt from 'jsonwebtoken'
import Promise from 'bluebird'
import config from 'application/core/config'
import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import { redisClient } from 'framework/core/adapters/redis'
import createLogger from 'framework/core/adapters/logger'
import Affiliation from 'application/core/models/affiliation'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'
import RequiredParameterError from 'framework/core/errors/required-parameter-error'
import InvalidCredentialsError from 'application/core/errors/invalid-credentials-error'
import UserBlockedError from 'application/core/errors/user-blocked-error'
import UserDidNotDoFirstAccess from 'application/core/errors/user-did-not-do-first-access'
import InvalidSessionParametersError from 'application/core/errors/invalid-session-parameters-error'
import { checkPasswordAndUpdate } from 'application/core/helpers/password'

const conf = config.middlewares
const Logger = createLogger({ name: 'JWT_SERVICE' })

const failKeyPrefix = 'fail_'
const blockKeyPrefix = 'block_'
const banKeyPrefix = 'ban_'

export default class JwtService {
  static createToken(locale, params) {
    return Promise.resolve()
      .then(validate)
      .then(findUser)
      .tap(checkUser)
      .then(createSessions)
      .then(respond)

    function validate() {
      if (
        !R.has('email', params) &&
        !R.has('phone_number', params) &&
        !R.has('document_number', params)
      ) {
        throw new InvalidSessionParametersError(locale)
      }

      if (!R.has('password', params)) {
        throw new RequiredParameterError(locale, 'password')
      }
    }

    function findUser() {
      const query = R.pick(
        ['email', 'phone_number', 'document_number'],
        R.reject(v => {
          if (R.isNil(v)) {
            return true
          }
          if (R.isEmpty(v)) {
            return true
          }
        }, params)
      )

      query.status = 'active'

      return User.findOne(query)
        .lean()
        .select({
          _id: 1,
          name: 1,
          user_metadata: 1,
          password_hash: 1,
          permissions: 1
        })
        .exec()
    }

    async function checkUser(user) {
      if (!user) {
        user = {
          _id: params.email || params.document_number || params.phone_number,
          password_hash: ''
        }
      }

      if (user && !user.password_hash) {
        throw new UserDidNotDoFirstAccess(locale)
      }

      const blockKey = `${blockKeyPrefix}${user._id}`
      let blockTime = await redisClient.ttl(blockKey)

      if (blockTime > 0) {
        throw new UserBlockedError(locale, blockTime)
      }

      const passwordIsValid = await checkPasswordAndUpdate(
        user,
        params.password
      )
      if (!passwordIsValid) {
        const attemptsLeft = await handleFailedLoginAttempt(user)

        if (attemptsLeft === 0) {
          blockTime = await handleBlockedUserFailedLoginAttempt(user)
          throw new UserBlockedError(locale, blockTime)
        }

        throw new InvalidCredentialsError(locale, attemptsLeft)
      }

      await redisClient.del(`${failKeyPrefix}${user._id}`)
      await redisClient.del(`${banKeyPrefix}${user._id}`)
      await redisClient.del(blockKey)
    }

    function createSessions(user) {
      const result = {
        sessions: []
      }

      return Promise.resolve(user.permissions)
        .each(createSession)
        .then(returnResult)

      async function createSession(permission) {
        const company = await Company.findOne({ _id: permission.company_id })
          .select({
            _id: 1,
            name: 1,
            document_number: 1
          })
          .lean()
          .exec()

        if (!company) {
          Logger.warn({ permission }, 'company-not-found')
          return
        }

        let affiliation = await Affiliation.findOne({
          company_id: company._id,
          provider: 'hash'
        })
          .select({
            allowed_capture_methods: 1,
            allowed_payment_methods: 1
          })
          .lean()
          .exec()

        if (!affiliation) {
          Logger.warn({ company }, 'affiliation-not-found')
          affiliation = {
            allowed_capture_methods: [],
            allowed_payment_methods: []
          }
        }

        return result.sessions.push(signJWT(company, user, affiliation))
      }

      function returnResult() {
        if (!result.sessions.length) {
          throw new UnauthenticatedError(
            locale,
            translate('services.jwt.account', locale)
          )
        }
        return result
      }
    }

    function respond(response) {
      return response
    }
  }

  static async unblockUser(locale, userId) {
    Logger.info({ userId: userId }, 'manual-unblock-user')

    await redisClient.del(`${failKeyPrefix}${userId}`)
    await redisClient.del(`${blockKeyPrefix}${userId}`)
    await redisClient.del(`${banKeyPrefix}${userId}`)
  }
}

async function handleFailedLoginAttempt(user) {
  const userId = `${user._id}`
  const failKey = `${failKeyPrefix}${userId}`
  const blockKey = `${blockKeyPrefix}${userId}`
  const banKey = `${banKeyPrefix}${userId}`

  const failedAttempts = await redisClient.incr(failKey)

  if (failedAttempts === 1) {
    await redisClient.expire(failKey, conf.auth.retry_timeout)
  }

  if (failedAttempts < conf.auth.retry_limit) {
    return conf.auth.retry_limit - failedAttempts
  }

  Logger.info(
    {
      userId: userId,
      attempts: failedAttempts
    },
    'block-user'
  )

  await redisClient.incr(banKey)
  await redisClient.incr(blockKey)
  await redisClient.del(failKey)

  return 0
}

async function handleBlockedUserFailedLoginAttempt(user) {
  const userId = `${user._id}`
  const blockKey = `${blockKeyPrefix}${userId}`
  let banCount = await redisClient.get(`${banKeyPrefix}${userId}`)

  if (banCount > conf.auth.ban_max_exp) {
    banCount = conf.auth.ban_max_exp
  }

  const block = conf.auth.ban_multiplier * conf.auth.ban_base ** banCount

  Logger.info(
    {
      userId: userId,
      attempts: banCount,
      timeoutSeconds: block
    },
    'block-user'
  )

  await redisClient.incr(blockKey)
  await redisClient.expire(blockKey, block)

  return block
}

export function signJWT(company, user, affiliation) {
  return jwt.sign(
    {
      company: {
        id: company._id,
        name: company.name,
        document_number: company.document_number
      },
      user: {
        id: user._id,
        name: user.name,
        type: user.user_metadata ? user.user_metadata.type : ''
      },
      affiliation: {
        allowed_capture_methods: affiliation.allowed_capture_methods,
        allowed_payment_methods: affiliation.allowed_payment_methods
      }
    },
    conf.jwt.secret_key,
    {
      expiresIn: conf.jwt.expires_in
    }
  )
}
