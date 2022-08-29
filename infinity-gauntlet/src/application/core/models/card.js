import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Card = new Schema(
  {
    first_digits: {
      type: String
    },
    last_digits: {
      type: String
    },
    brand: {
      type: String
    },
    country: {
      type: String
    },
    holder_name: {
      type: String
    },
    valid: {
      type: String
    },
    provider_card_id: {
      type: String,
      required: true
    },
    provider_customer_id: {
      type: String
    },
    provider: {
      type: String,
      required: true
    },
    expiration_date: {
      type: String
    },
    parent_id: {
      type: String
    },
    company_id: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

Card.plugin(mongooseTime())

export default mongoose.model('Card', Card)
