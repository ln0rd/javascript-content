import mongoose from 'mongoose'

import SplitRule from 'application/core/models/split-rule'

const ObjectId = mongoose.Types.ObjectId

export default async function SplitRuleFactory(
  company_id = ObjectId(),
  transaction_id = ObjectId()
) {
  const splitRule = {
    charge_processing_cost: false,
    company_id: company_id,
    amount: 100,
    percentage: 30,
    _id: ObjectId(),
    liable: false,
    transaction_id: transaction_id
  }

  return await SplitRule.create(splitRule)
}
