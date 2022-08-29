import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const HashboardDistribution = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['cloudfront'],
      default: 'cloudfront'
    },
    provider_id: {
      type: String,
      required: true
    },
    name: {
      type: String
    },
    description: {
      type: String
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    usePushEach: true
  }
)

HashboardDistribution.plugin(mongooseTime())

export default mongoose.model('HashboardDistribution', HashboardDistribution)
