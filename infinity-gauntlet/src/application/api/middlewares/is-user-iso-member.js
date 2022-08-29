import mongoose from 'mongoose'
import UserIsNotISOMember from 'application/core/errors/user-is-not-iso-member'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'

const { Types } = mongoose
const { ObjectId } = Types

const Logger = createLogger({ name: 'IS_USER_ISO_MEMBER_MIDDLEWARE' })

export function isUserISOMember(req, res, next) {
  Logger.debug('Check if user is iso member.')
  const { owner_id, viewers } = req.body
  const users = [ObjectId(owner_id)]

  if (viewers) {
    users.concat(viewers.map(id => ObjectId(id)))
  }

  Company.findOne({
    _id: req.get('company').id,
    users: { $in: users }
  })
    .then(company => {
      if (company) {
        return next()
      }
      Logger.debug('User is not iso member.')
      return next(new UserIsNotISOMember(req.get('locale')))
    })
    .catch(error => {
      Logger.error('Error finding company', error)
    })
}
