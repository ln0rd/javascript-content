import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const ChargeConfiguration = new Schema(
  {
    amount: {
      type: Number
    },
    provider: {
      type: String,
      required: true,
      enum: ['stone', 'hash']
    },
    description: {
      type: String
    },
    model: {
      type: String
    },
    model_id: {
      type: String
    },
    charge_method: {
      type: String,
      required: true,
      enum: ['balance_debit', 'credit_card', 'boleto'],
      default: 'balance_debit'
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'paused', 'canceled', 'finished']
    },
    initial_charge_date: {
      type: String,
      required: true
    },
    next_charge_date: {
      type: String
    },
    executed_charges: {
      type: Number
    },
    interval: {
      type: String,
      required: true,
      default: 'monthly',
      enum: ['monthly', 'weekly', 'annually']
    },
    charges: {
      type: Number
    },
    company_id: {
      type: String,
      required: true
    },
    destination_company_id: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

ChargeConfiguration.index({
  company_id: 1,
  created_at: -1
})

ChargeConfiguration.plugin(mongooseTime())

export default mongoose.model('ChargeConfiguration', ChargeConfiguration)
