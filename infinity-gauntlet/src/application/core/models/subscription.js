import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose
const { ObjectId } = Schema

const Subscription = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    charges: {
      type: Number
    },
    installments: {
      type: Number,
      default: 1
    },
    day: {
      type: Number,
      required: true
    },
    frequency: {
      type: String,
      required: true,
      enum: ['fixed', 'monthly', 'weekly', 'annually']
    },
    current_charge: {
      type: Number,
      ref: 'Charge'
    },
    current_period_start: {
      type: Date,
      required: true
    },
    current_period_end: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    trial_days: {
      type: Number
    },
    status: {
      type: String,
      required: true,
      enum: [
        'processing',
        'trial',
        'pending_payment',
        'paid',
        'unpaid',
        'canceled'
      ]
    },
    metadata: {
      type: String
    },
    split_rules: [
      {
        type: ObjectId,
        ref: 'SplitRule'
      }
    ],
    payment_methods: {
      type: Array,
      default: ['boleto', 'credit_card']
    },
    payment_method: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'boleto', 'money']
    },
    payment_provider: {
      type: String,
      required: true
    },
    company_id: {
      type: String,
      required: true
    },
    card: {
      type: ObjectId,
      ref: 'Card'
    },
    customer: {
      type: ObjectId,
      ref: 'Customer'
    },
    postback_url: {
      type: String
    },
    postback_format: {
      type: String,
      default: 'json',
      enum: ['json', 'xml', 'urlenconded']
    },
    post_deadline_rules: {
      charges_attempts: {
        type: Number
      },
      charges_interval: {
        type: Number
      },
      cancel_subscription_after_charges: {
        type: Boolean
      }
    }
  },
  {
    usePushEach: true
  }
)

Subscription.plugin(mongooseTime())
Subscription.plugin(autoIncrement.plugin, {
  model: 'Subscription',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Subscription', Subscription)
