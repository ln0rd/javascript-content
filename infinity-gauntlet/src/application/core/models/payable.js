import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose

const DataBackup = new Schema({
  cost: {
    type: Number,
    required: true
  },
  fee: {
    type: Number,
    required: true
  },
  payment_date: {
    type: String,
    required: true
  },
  anticipatable: {
    type: Boolean
  },
  affected_by_cip: {
    type: Boolean
  },
  anticipated: {
    type: Boolean
  },
  anticipation_fee: {
    type: Number
  },
  anticipation_cost: {
    type: Number
  },
  anticipation_amount: {
    type: Number
  },
  amount: {
    type: Number
  }
})

const Payable = new Schema(
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
    mcc: {
      type: String
    },
    anticipated: {
      type: Boolean,
      default: false
    },
    anticipatable: {
      type: Boolean,
      default: true
    },
    settlement_id: {
      type: String
    },
    origin_affiliation_id: {
      type: String
    },
    provider_model_id: {
      type: String
    },
    provider_model: {
      type: String
    },
    transaction_id: {
      type: Number,
      required: true
    },
    provider_transaction_id: {
      type: String
    },
    transaction_nsu: {
      type: String
    },
    transaction_canceled: {
      type: Boolean,
      default: false
    },
    amount: {
      type: Number,
      required: true
    },
    conciliated_amount: {
      type: Number,
      default: 0
    },
    mdr_amount: {
      type: Number,
      default: 0
    },
    anticipation_amount: {
      type: Number,
      default: 0
    },
    transaction_amount: {
      type: Number
    },
    fee: {
      type: Number,
      default: 0
    },
    anticipation_fee: {
      type: Number,
      default: 0
    },
    mdr_fee: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    },
    anticipation_cost: {
      type: Number,
      default: 0
    },
    mdr_cost: {
      type: Number,
      default: 0
    },
    conciliated_cost: {
      type: Number,
      default: 0
    },
    conciliated_mdr_cost: {
      type: Number,
      default: 0
    },
    conciliated_anticipation_cost: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      required: true,
      enum: ['paid', 'waiting_funds', 'suspended']
    },
    capture_method: {
      type: String,
      enum: ['emv', 'magstripe', 'ecommerce', 'contactless_icc'],
      required: true
    },
    split_rule_id: {
      type: String
    },
    total_installments: {
      type: Number
    },
    installment: {
      type: Number
    },
    payment_method: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'boleto', 'money']
    },
    payment_date: {
      type: String,
      required: true,
      index: true
    },
    original_payment_date: {
      type: String
    },
    transaction_captured_at: {
      type: String
    },
    card_brand: {
      type: String
    },
    type: {
      type: String,
      required: true,
      enum: ['credit', 'refund', 'chargeback_debit']
    },
    processed: {
      type: Boolean,
      default: false
    },
    company_id: {
      type: String,
      required: true
    },
    origin_company_id: {
      type: String,
      required: true
    },
    owner_company_id: {
      type: String,
      required: true
    },
    iso_id: {
      type: String,
      index: true,
      required: false // To keep compatibility with old documents
    },
    data_backup: {
      type: DataBackup
    },
    anticipation: {
      type: Schema.Types.ObjectId,
      ref: 'SpotAnticipation'
    },
    cip_escrowed_amount: {
      type: Number,
      required: false,
      default: 0
    },
    recalculated: {
      type: Boolean,
      default: false
    },
    affected_by_cip: {
      type: Boolean,
      default: false
    }
  },
  {
    usePushEach: true
  }
)

Payable.index({
  transaction_id: 1,
  company_id: 1,
  payment_date: -1
})

Payable.index({
  company_id: 1,
  status: 1,
  payment_date: -1
})

Payable.index({
  iso_id: 1,
  company_id: 1,
  status: 1,
  payment_date: -1
})

Payable.index({
  provider: 1,
  status: 1,
  payment_date: 1
})

Payable.index({
  company_id: 1,
  payment_date: -1
})

Payable.index({
  transaction_id: 1,
  processed: 1
})

Payable.index({
  card_brand: 1,
  company_id: 1,
  payment_date: 1,
  payment_method: 1
})

Payable.index({
  card_brand: 1,
  company_id: 1,
  original_payment_date: 1,
  payment_method: 1
})

Payable.index({
  settlement_id: 1
})

Payable.plugin(mongooseTime())
Payable.plugin(autoIncrement.plugin, {
  model: 'Payable',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Payable', Payable)
