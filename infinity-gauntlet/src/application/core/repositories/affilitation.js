import R from 'ramda'
import Affiliation from 'application/core/models/affiliation'
import { findOne } from 'application/core/repositories/base'

export const byTransaction = ({ affiliation_id }) => ({ _id: affiliation_id })

export default {
  byTransaction,
  findOne: R.partial(findOne, [Affiliation])
}
