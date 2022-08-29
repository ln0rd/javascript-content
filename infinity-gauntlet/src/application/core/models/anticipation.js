import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import R from 'ramda'

import { generateUuidV4 } from 'application/core/helpers/uuid'

const { Schema } = mongoose

export const FAILED = 'failed'
export const CANCELED = 'canceled'
export const ANTICIPATED = 'anticipated'
export const CONFIRMED = 'confirmed'
export const PROCESSING = 'processing'

export const errorReasons = {
  notEnoughFunds: 'not_enough_funds',
  anticipationError: 'anticipation_error',
  declinedByCIP: 'declined_by_cip'
}

const AnticipationSummary = new Schema({
  date: {
    type: String,
    required: true
  },
  duration: {
    type: Number
  },
  anticipation_fee_amount: {
    type: Number,
    required: true
  },
  anticipatable_amount: {
    type: Number,
    required: true
  },
  net_amount: {
    type: Number,
    required: true
  },
  payables_count: {
    type: Number,
    required: true
  }
})

const EstimatedDataSchema = new Schema({
  net_amount: {
    type: Number,
    required: true
  },
  anticipation_fee_amount: {
    type: Number,
    required: true
  },
  anticipatable_amount: {
    type: Number,
    required: true
  }
})

const status = [FAILED, CANCELED, ANTICIPATED, CONFIRMED, PROCESSING]
const Anticipation = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['spot'],
      default: 'spot'
    },
    anticipating_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    parent_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company'
    },
    requested_by_parent: {
      type: Boolean,
      required: true,
      default: false
    },
    requested_amount: {
      type: Number,
      required: true
    },
    anticipatable_amount: {
      type: Number,
      required: true
    },
    anticipation_fee_amount: {
      type: Number,
      required: true
    },
    anticipation_type: {
      type: String,
      enum: ['per_month', 'per_installment'],
      required: true
    },
    net_amount: {
      type: Number,
      required: true
    },
    estimated_data: EstimatedDataSchema,
    status: {
      type: String,
      required: true,
      enum: status
    },
    status_history: [
      {
        type: String,
        required: true
      }
    ],
    canceled_at: {
      type: Date,
      required: function() {
        return this.status === CANCELED
      }
    },
    payables_count: {
      type: Number,
      required: true
    },
    payables_priority: {
      type: String,
      enum: ['start', 'end'],
      required: true
    },
    anticipation_fee: {
      type: Number,
      required: true
    },
    anticipate_to: {
      type: String,
      required: true
    },
    anticipate_all: {
      type: Boolean,
      required: true,
      default: false
    },
    detailed_summary: [
      {
        type: AnticipationSummary
      }
    ],
    revert_attempts: {
      type: Number,
      default: 0
    },
    reverted: {
      type: Boolean,
      default: false
    },
    error_reason: {
      type: String,
      enum: R.values(errorReasons)
    },
    cip_operation_registered: {
      type: Boolean,
      default: false
    },
    cip_correlation_id: {
      type: String,
      default: generateUuidV4,
      unique: true
    }
  },
  {
    usePushEach: true
  }
)

Anticipation.plugin(mongooseTime())

export default mongoose.model('Anticipation', Anticipation)
