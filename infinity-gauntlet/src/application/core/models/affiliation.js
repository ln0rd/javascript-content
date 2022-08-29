import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'
import {
  captureMethodsEnum,
  paymentMethodsEnum
} from 'application/core/domain/methods'
import { BoletoPricing, CardPricing } from 'application/core/domain/pricing'
import { CHARGEBACK_HANDLING_POLICIES } from 'modules/financial-calendar/domain/chargeback-handling'

const { Schema } = mongoose

const CostSchema = new Schema(CardPricing, {
  usePushEach: true
})

const BrandsSchema = new Schema(
  {
    brand: {
      type: String,
      enum: cardBrands.names(),
      required: true
    },
    cost: CostSchema
  },
  {
    usePushEach: true
  }
)

const Affiliation = new Schema(
  {
    provider: {
      type: String,
      required: true
    },
    provider_id: {
      type: String
    },
    internal_provider: {
      type: String
    },
    soft_descriptor: {
      type: String
    },
    key: {
      type: String
    },
    security_key: {
      type: String
    },
    merchant_id: {
      type: String,
      required: true
    },
    internal_merchant_id: {
      type: String
    },
    wallet_id: {
      type: String
    },
    sales_key: {
      type: String
    },
    anticipation_type: {
      type: String,
      enum: ['spot', 'automatic']
    },
    anticipation_day_start: {
      type: Number
    },
    anticipation_days_interval: {
      type: Number
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'processing', 'blocked', 'pending_approval']
    },
    provider_status_code: {
      type: Number
    },
    provider_status_message: {
      type: String
    },
    enabled: {
      type: Boolean,
      default: false,
      required: true
    },
    costs: {
      anticipation_cost: {
        type: Number
        // required: true
      },
      brands: [BrandsSchema],
      boleto_pricing: BoletoPricing
    },
    company_id: {
      type: String,
      required: true
    },
    allowed_capture_methods: [captureMethodsEnum],
    allowed_payment_methods: [paymentMethodsEnum],
    chargeback_handling_policy: {
      type: String,
      enum: CHARGEBACK_HANDLING_POLICIES
    },
    iso_id: {
      type: String,
      required: true,
      index: true
    },
    _company_partial: {
      name: {
        type: String
      },
      full_name: {
        type: String
      },
      document_number: {
        type: String
      },
      document_type: {
        type: String,
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

Affiliation.index({
  provider: 1,
  status: 1,
  created_at: 1
})

Affiliation.index({
  company_id: 1,
  provider: 1,
  status: 1,
  enabled: 1,
  created_at: -1
})

Affiliation.plugin(mongooseTime())

export default mongoose.model('Affiliation', Affiliation)
