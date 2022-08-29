import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'
import { CardPricing } from 'application/core/domain/pricing'

const { Schema } = mongoose

const CostSchema = new Schema(CardPricing, {
  usePushEach: true
})

const BrandsSchema = new Schema(
  {
    brand: {
      type: String,
      enum: cardBrands.names()
    },
    cost: CostSchema
  },
  {
    usePushEach: true
  }
)

const MinimumBrandsSchema = new Schema(
  {
    brand: {
      type: String,
      enum: cardBrands.names()
    },
    fee: CostSchema
  },
  {
    usePushEach: true
  }
)

const MccSchema = new Schema(
  {
    mcc: {
      type: String,
      required: true
    },
    provider: {
      type: String
    },
    hash_markup: {
      type: Number
    },
    anticipation_cost: {
      type: Number
    },
    minimum_anticipation_fee: {
      type: Number
    },
    minimum_brands_fee: [MinimumBrandsSchema],
    brands: [BrandsSchema],
    company_id: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

MccSchema.plugin(mongooseTime())

export default mongoose.model('MccSchema', MccSchema)
