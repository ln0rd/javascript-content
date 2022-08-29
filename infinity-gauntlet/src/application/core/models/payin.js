import R from 'ramda'
import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

export const destinationTypes = {
  wallet: 'wallet',
  bankAccount: 'bank_account'
}

export const sourceTypes = {
  wallet: 'wallet'
}

export const methods = {
  ted: 'ted',
  walletTransfer: 'wallet_transfer'
}

export const reasons = {
  normalPayment: 'normal_payment',
  walletTransfer: 'wallet_transfer',
  scheduledWalletTransfer: 'scheduled_wallet_transfer',
  bankAccountValidation: 'bank_account_validation'
}

export const status = {
  pending: 'pending',
  confirmed: 'confirmed',
  canceled: 'canceled',
  paid: 'paid',
  failed: 'failed',
  inTransit: 'in_transit'
}

const { Schema } = mongoose

const Payin = new Schema(
  {
    provider: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    fee: {
      type: Number,
      default: 0
    },
    source_type: {
      type: String,
      enum: R.values(sourceTypes),
      default: sourceTypes.wallet
    },
    source_id: {
      type: String,
      required: true
    },
    destination_type: {
      type: String,
      required: true,
      default: destinationTypes.wallet,
      enum: R.values(destinationTypes)
    },
    destination_id: {
      type: String,
      required: true
    },
    method: {
      type: String,
      enum: R.values(methods),
      required: true,
      default: methods.walletTransfer
    },
    reason: {
      type: String,
      default: reasons.normalPayment,
      enum: R.values(reasons)
    },
    status: {
      type: String,
      required: true,
      enum: R.values(status)
    },
    status_code: {
      type: String
    },
    date: {
      type: String,
      required: true
    },
    company_id: {
      type: String,
      required: true
    },
    operation_id: {
      type: Schema.Types.ObjectId,
      required: function() {
        return this.destination_type === destinationTypes.wallet
      }
    },
    scheduled_to: {
      type: String
    }
  },
  {
    usePushEach: true
  }
)

Payin.plugin(mongooseTime())

export default mongoose.model('Payin', Payin)
