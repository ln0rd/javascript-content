import Mongoose from 'mongoose'
import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'
import IdentityClient from '@hashlab/identity-client'

export const Logger = createLogger({
  name: 'AUTHENTICATOR_MIDDLEWARE'
})

export async function getUser(userId) {
  const user = await User.findById(Mongoose.Types.ObjectId(userId))
    .select('_id')
    .lean()
    .exec()

  return user
}

export async function getCompany(companyId) {
  const company = await Company.findById(Mongoose.Types.ObjectId(companyId))
    .select('_id')
    .lean()
    .exec()

  return company
}

const getExternalProfileIdByKey = (response, key) => {
  if (!response || !Array.isArray(response[key]) || !response[key].length) {
    return null
  }
  return typeof response[key][0] === 'object'
    ? response[key][0].external_profile_id
    : null
}

export async function getUserAndCompany(response) {
  const userId = getExternalProfileIdByKey(response, 'user_profiles')

  const companyId = getExternalProfileIdByKey(response, 'organization_profiles')

  const [user, company] = await Promise.all([
    this.getUser(userId),
    this.getCompany(companyId)
  ])

  if (userId && companyId && !user && !company) {
    throw new Error(`User and company doesn't exist`)
  }

  if (companyId && !company) {
    throw new Error(`Company doesn't exist`)
  }

  return { user, company }
}

export async function identityBearerToken(req, res, next) {
  const { credentials: token } = req.authorization || {}

  try {
    const client = IdentityClient.create()

    const response = await client.introspectToken(token)
    const { user, company } = await this.getUserAndCompany(response)

    if (user) {
      req.set('user', {
        id: user._id.toString(),
        _id: user._id.toString()
      })
      Logger.info(
        {
          user_id: user._id.toString(),
          type: 'identity'
        },
        'authentication_method'
      )
    }

    if (company) {
      req.set('company', {
        id: company._id.toString(),
        _id: company._id.toString()
      })
      Logger.info(
        {
          company_id: company._id.toString(),
          type: 'identity'
        },
        'authentication_method'
      )
    }

    req.set('authenticationMethod', 'bearer')
    return next()
  } catch (err) {
    Logger.error({ err }, 'jwt-identity-api-middleware-failed')
    if (err.public) {
      return next(err)
    }
    return next(new UnauthenticatedError(req.get('locale'), err))
  }
}
