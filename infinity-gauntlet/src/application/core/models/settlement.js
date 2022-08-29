import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'

const { Schema } = mongoose

export const brand = {
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

const Settlement = new Schema(
  {
    affiliations: [
      {
        type: String
      }
    ],
    provider: {
      type: String
    },
    settlement_type: {
      type: String,
      enum: ['bank_account', 'prepaid_card', 'wallet'],
      required: true,
      default: 'bank_account'
    },
    status: {
      type: String,
      enum: ['settled', 'failed', 'processing']
    },
    date: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    settled_amount: {
      type: Number,
      required: true
    },
    last_negative_amount: {
      type: Number,
      default: 0
    },
    brands: [brand],
    boleto: {
      payables: [Number],
      amount: Number
    },
    charges: [
      {
        id: {
          type: Number
        },
        description: {
          type: String
        },
        amount: {
          type: Number
        },
        destination_company_id: {
          type: String
        },
        partial_charge: {
          type: Boolean,
          default: false
        }
      }
    ],
    received_charges: [
      {
        id: {
          type: Number
        },
        description: {
          type: String
        },
        amount: {
          type: Number
        },
        origin_company_id: {
          type: String
        },
        partial_charge: {
          type: Boolean,
          default: false
        }
      }
    ],
    paid_operating_debts: [
      {
        debt_id: {
          type: Schema.Types.ObjectId,
          ref: 'OperatingDebt'
        },
        paid_amount: {
          type: Number
        },
        payments_by_brand: [brand]
      }
    ],
    operating_debt_created: {
      debt_id: {
        type: Schema.Types.ObjectId,
        ref: 'OperatingDebt'
      },
      debt_amount: {
        type: Number
      }
    },
    wallet_id: {
      type: String
    },
    company_id: {
      type: String,
      required: true
    },
    cip_escrowed_amount: {
      type: Number,
      default: 0
    }
  },
  {
    usePushEach: true
  }
)

Settlement.index({
  company_id: 1,
  date: -1
})

Settlement.plugin(mongooseTime())

export default mongoose.model('Settlement', Settlement)
