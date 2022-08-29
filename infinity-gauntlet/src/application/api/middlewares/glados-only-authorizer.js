import R from 'ramda'
import config from 'application/core/config'
import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'

async function isGladosUser(id) {
  const user = await User.findOne({ _id: id })
    .select('permissions')
    .lean()
    .exec()

  return user.permissions.some(
    permission => permission.company_id === config.permissions.glados_id
  )
}

async function isGladosHashKey(hashKey) {
  const gladosId = config.permissions.glados_id
  const glados = await Company.findOne({ _id: gladosId })
    .select('hash_key')
    .lean()
    .exec()

  return hashKey === glados.hash_key
}

export async function gladosOnlyAuthorizer(req, res, next) {
  const authMethod = req.get('authenticationMethod')

  if (authMethod === 'jwt') {
    const user = req.get('user')
    if (user && (await isGladosUser(user.id))) {
      return next()
    }
  } else if (authMethod === 'hash_key') {
    const hashKey = R.pathOr('', ['authorization', 'basic', 'password'], req)
    const company = req.get('company')
    if (company && (await isGladosHashKey(hashKey))) {
      return next()
    }
  }

  return next(new UnauthorizedError(req.get('locale'), authMethod))
}
