import faker from 'faker'
import moment from 'moment'
import mongoose from 'mongoose'

import Dispute from 'application/core/models/dispute'

const ObjectId = mongoose.Types.ObjectId

export default async function DisputeFactory(
  transaction_id = faker.finance.account(6)
) {
  const dispute = {
    _id: ObjectId(),
    created_at: moment().toISOString(),
    updated_at: moment().toISOString(),
    transaction_id: transaction_id
  }
  return await Dispute.create(dispute)
}
