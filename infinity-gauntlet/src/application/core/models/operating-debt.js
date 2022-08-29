import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'

const { Schema } = mongoose

export const STATUS_PAID = 'paid'
export const STATUS_PENDING = 'pending'
export const STATUS_CANCELED = 'canceled'

export const SETTLEMENT_DEBT = 'settlement_debt'
export const DEBT_TRANSFER = 'debt_transfer'
export const WALLET_NEGATIVE_BALANCE = 'wallet_negative_balance'
export const NC_BUG_ADJUSTMENT = 'nc_bug_adjustment'
export const MDR_FEE_ADJUSTMENT = 'mdr_fee_adjustment'
export const ANTICIPATION_FEE_ADJUSTMENT = 'anticipation_fee_adjustment'
export const ANTICIPATION = 'anticipation'
export const PIX_REFUND = 'pix_refund'
export const TED_REFUND = 'ted_refund'
export const SETTLEMENT_REFUND = 'settlement_refund'
export const CHARGE_REFUND = 'charge_refund'
export const CHARGEBACK_REFUND = 'chargeback_refund'
export const WALLET_TRANSFER = 'wallet_transfer'
export const POS_ACQUISITION_TOTAL_REFUND = 'pos_acquisition_total_refund'
export const POS_ACQUISITION_PARTIAL_REFUND = 'pos_acquisition_partial_refund'
export const OTHER = 'other'

export const operatingDebtsType = [
  SETTLEMENT_DEBT,
  DEBT_TRANSFER,
  WALLET_NEGATIVE_BALANCE,
  NC_BUG_ADJUSTMENT,
  MDR_FEE_ADJUSTMENT,
  ANTICIPATION_FEE_ADJUSTMENT,
  ANTICIPATION,
  PIX_REFUND,
  TED_REFUND,
  SETTLEMENT_REFUND,
  CHARGE_REFUND,
  CHARGEBACK_REFUND,
  WALLET_TRANSFER,
  POS_ACQUISITION_TOTAL_REFUND,
  POS_ACQUISITION_PARTIAL_REFUND,
  OTHER
]

const brand = {
  brand: {
    type: String,
    enum: cardBrands.names().concat(['vr', 'unknown'])
  },
  debit: {
    type: Number,
    default: 0
  },
  credit: {
    type: Number,
    default: 0
  },
  installment_credit: {
    type: Number,
    default: 0
  },
  anticipated_credit: {
    type: Number,
    default: 0
  }
}

const PaymentHistory = new Schema(
  {
    used_amount: {
      type: Number,
      required: true
    },
    model: {
      type: String
    },
    model_id: {
      type: String
    },
    description: {
      type: String
    },
    payment_date: {
      type: String
    },
    payments_by_brand: [brand]
  },
  {
    usePushEach: true
  }
)

const OperatingDebt = new Schema(
  {
    company_id: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    status: {
      type: String,
      enum: [STATUS_PENDING, STATUS_CANCELED, STATUS_PAID],
      default: STATUS_PENDING
    },
    debt_amount: {
      type: Number,
      required: true
    },
    paid_amount: {
      type: Number,
      default: 0
    },
    model: {
      type: String
    },
    model_id: {
      type: String
    },
    type: {
      type: String,
      enum: operatingDebtsType,
      default: SETTLEMENT_DEBT
    },
    description: {
      type: String
    },
    cancel_reason: {
      type: String
    },
    payment_history: [PaymentHistory]
  },
  {
    usePushEach: true
  }
)

OperatingDebt.plugin(mongooseTime())

OperatingDebt.index({
  company_id: 1
})

OperatingDebt.index({
  company_id: 1,
  status: 1
})

OperatingDebt.index({
  model: 1,
  model_id: 1
})

export default mongoose.model('OperatingDebt', OperatingDebt)
