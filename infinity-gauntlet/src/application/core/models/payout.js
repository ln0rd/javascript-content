import R from 'ramda'
import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

export const destinationTypes = {
  wallet: 'wallet',
  bankAccount: 'bank_account'
}

export const sourceTypes = {
  wallet: 'wallet',
  infinityGauntlet: 'infinity-gauntlet',
  balance: 'balance'
}

export const methods = {
  ted: 'ted',
  pix: 'pix',
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

const PayoutProvider = new Schema({
  uuid: {
    type: String
  },
  transfer_code: {
    type: String
  },
  rail_id: {
    type: String
  },
  rail_type: {
    type: String
  },
  create_raw_response: {
    type: String
  },
  confirm_raw_request: {
    type: String
  },
  result_raw_request: {
    type: Array
  }
})

const BankAccount = new Schema(
  {
    bank_code: {
      type: String,
      required: true
    },
    agencia: {
      type: String,
      required: true
    },
    agencia_dv: {
      type: String
    },
    conta: {
      type: String,
      required: true
    },
    conta_dv: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      default: 'conta_corrente',
      enum: [
        'conta_corrente',
        'conta_poupanca',
        'conta_corrente_conjunta',
        'conta_poupanca_conjunta'
      ]
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'valid', 'invalid']
    },
    document_type: {
      type: String,
      enum: ['cnpj', 'cpf']
    },
    document_number: {
      type: String,
      required: true
    },
    legal_name: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

const Payout = new Schema(
  {
    provider: {
      type: String,
      required: true
    },
    automatic: {
      type: Boolean,
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
    destination: BankAccount,
    payout_provider: PayoutProvider,
    destination_type: {
      type: String,
      required: true,
      default: destinationTypes.bankAccount,
      enum: R.values(destinationTypes)
    },
    destination_id: {
      type: String,
      required: function() {
        return this.destination_type === destinationTypes.wallet
      }
    },
    metadata: {},
    method: {
      type: String,
      enum: R.values(methods),
      required: true,
      default: methods.pix
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
    status_message: {
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
    frozen_amount_id: {
      type: String
    },
    operation_id: {
      type: Schema.Types.ObjectId,
      required: function() {
        return this.destination_type === destinationTypes.wallet
      }
    },
    scheduled_to: {
      type: String
    },
    iso_id: {
      type: String,
      required: true,
      index: true
    },
    _company_partial: {
      name: {
        type: String,
        required: true
      },
      document_number: {
        type: String,
        required: true
      },
      full_name: {
        type: String
      },
      document_type: {
        type: String,
        required: true,
        enum: ['cnpj', 'cpf']
      },
      company_metadata: {},
      created_at: {
        type: Date
      }
    }
  },
  {
    usePushEach: true
  }
)

Payout.index({
  'payout_provider.transfer_code': 1,
  status: 1
})

Payout.index({
  'payout_provider.rail_id': 1,
  status: 1
})

Payout.index({
  company_id: 1,
  date: -1,
  reason: 1,
  status: 1
})

Payout.index({
  company_id: 1,
  'destination.status': 1,
  reason: 1
})

Payout.plugin(mongooseTime())
Payout.plugin(autoIncrement.plugin, {
  model: 'Payout',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Payout', Payout)
