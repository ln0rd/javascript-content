import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'
import { BoletoPricing, CardPricing } from 'application/core/domain/pricing'

const { Schema } = mongoose

const FeeSchema = new Schema(CardPricing, {
  usePushEach: true
})

const BrandsSchema = new Schema(
  {
    brand: {
      type: String,
      enum: cardBrands.names(),
      required: true
    },
    fee: FeeSchema
  },
  {
    usePushEach: true
  }
)

const FeeRule = new Schema(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true
    },
    anticipation_fee: {
      type: Number,
      required: true
    },
    anticipation_type: {
      type: String,
      enum: ['per_month', 'per_installment', 'per_additional_installment'],
      default: 'per_month'
    },
    brands: [BrandsSchema],
    boleto_pricing: BoletoPricing,
    company_id: {
      type: String,
      required: true
    },
    iso_id: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    usePushEach: true
  }
)

FeeRule.index({
  iso_id: 1,
  enabled: 1,
  created_at: -1
})

FeeRule.index({
  created_at: -1
})

FeeRule.index({
  company_id: 1,
  enabled: 1
})

FeeRule.plugin(mongooseTime())

export default mongoose.model('FeeRule', FeeRule)
