import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import R from 'ramda'

const { Schema } = mongoose

export const FAILED = 'failed'
export const SUCCESSFUL = 'successful'
export const SCHEDULED = 'scheduled'
export const CANCELED = 'canceled'
export const operations = {
  instantiateWallet: 'instantiate_wallet',
  freezeAmount: 'freeze_amount',
  putMoney: 'put_money',
  takeMoney: 'take_money',
  finishTransfer: 'finish_transfer',
  unfreezeAmount: 'unfreeze_amount',
  takeMoneyBack: 'take_money_back',
  schedule: 'schedule',
  cancel: 'cancel',
  noRevertActionRequired: 'no_revert_action_required'
}
export const errorReasons = {
  notEnoughFunds: 'not_enough_funds',
  transactionError: 'transaction_error'
}

const operationsValues = R.values(operations)
const errorReasonsValues = R.values(errorReasons)

const status = [FAILED, SUCCESSFUL, SCHEDULED, CANCELED]
const WalletTransferHistory = new Schema(
  {
    request_id: {
      type: String,
      required: true
    },
    requester_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    source_wallet_id: {
      type: String,
      required: true
    },
    source_provider: {
      type: String,
      required: true
    },
    source_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    source_company_name: {
      type: String
    },
    destination_company_name: {
      type: String
    },
    destination_wallet_id: {
      type: String,
      required: true
    },
    destination_provider: {
      type: String,
      required: true
    },
    freeze_id: {
      type: String,
      required: function() {
        return this.success_at.includes(operations.freezeAmount)
      },
      default: ''
    },
    destination_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    requested_amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: status,
      required: true
    },
    success_at: [
      {
        type: String,
        enum: operationsValues
      }
    ],
    error_at: [
      {
        type: String,
        enum: operationsValues
      }
    ],
    captured_errors: [
      {
        type: Schema.Types.Mixed
      }
    ],
    error_reasons: [
      {
        type: String,
        enum: errorReasonsValues
      }
    ],
    tried_to_revert: {
      type: Boolean,
      required: true,
      default: false
    },
    reverted: {
      type: Boolean
    },
    revert_attempts: {
      type: Number
    },
    scheduled_to: {
      type: Date,
      required: function() {
        return this.status === SCHEDULED
      }
    },
    canceled_at: {
      type: Date,
      required: function() {
        return this.status === CANCELED
      }
    },
    transferred_at: {
      type: Date,
      required: function() {
        return this.status === SUCCESSFUL
      }
    }
  },
  {
    usePushEach: true
  }
)

WalletTransferHistory.plugin(mongooseTime())

export default mongoose.model('WalletTransferHistory', WalletTransferHistory)
