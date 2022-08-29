import R from 'ramda'
import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose

export const status = {
  pending: 'pending_payment',
  paid: 'paid',
  unpaid: 'unpaid',
  canceled: 'canceled'
}

export const methods = {
  balanceDebit: 'balance_debit',
  boleto: 'boleto',
  creditCard: 'credit_card'
}

const PaymentHistory = new Schema({
  amount: { type: Number },
  date: { type: String },
  destination_settlement: {
    type: Schema.Types.ObjectId,
    ref: 'Settlement'
  },
  source_settlement: {
    type: Schema.Types.ObjectId,
    ref: 'Settlement'
  }
})

const Charge = new Schema(
  {
    provider: {
      type: String,
      required: true
    },
    provider_id: {
      type: String
    },
    affiliation_id: {
      type: String
    },
    type: {
      type: String,
      enum: ['default', 'cashback'],
      default: 'default'
    },
    destination_affiliation_id: {
      type: String
    },
    charge_configuration_id: {
      type: String
    },
    provider_model_id: {
      type: String
    },
    model: {
      type: String
    },
    model_id: {
      type: String
    },
    provider_model: {
      type: String
    },
    description: {
      type: String
    },
    amount: {
      type: Number,
      required: true
    },
    conciliated_amount: {
      type: Number,
      default: 0
    },
    paid_amount: {
      type: Number,
      default: 0
    },
    payment_history: [PaymentHistory],
    status: {
      type: String,
      required: true,
      enum: R.values(status)
    },
    original_charge_date: {
      type: String
    },
    charge_date: {
      type: String,
      required: true
    },
    charge_method: {
      type: String,
      required: true,
      enum: R.values(methods),
      default: methods.balanceDebit
    },
    processed: {
      type: Boolean,
      default: false
    },
    company_id: {
      type: String,
      required: true
    },
    destination_company_id: {
      type: String,
      required: true
    },
    iso_id: {
      type: String,
      index: true
    },
    _company_partial: {
      name: {
        type: String,
        required: true
      },
      full_name: {
        type: String
      },
      document_number: {
        type: String,
        required: true
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

Charge.plugin(mongooseTime())
Charge.plugin(autoIncrement.plugin, {
  model: 'Charge',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Charge', Charge)
