import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const SplitRule = new Schema(
  {
    amount: {
      type: Number
    },
    percentage: {
      type: Number
    },
    charge_processing_cost: {
      type: Boolean,
      default: true
    },
    liable: {
      type: Boolean
    },
    company_id: {
      type: String,
      required: true
    },
    transaction_id: {
      type: String
    }
  },
  {
    usePushEach: true
  }
)

SplitRule.plugin(mongooseTime())

export default mongoose.model('SplitRule', SplitRule)
