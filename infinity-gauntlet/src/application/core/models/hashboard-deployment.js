import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const HashboardDeployment = new Schema(
  {
    environment: {
      type: String,
      required: true,
      enum: ['production', 'staging', 'development']
    },
    infrastructure_provider: {
      type: String,
      required: true,
      default: 'amazon',
      enum: ['amazon']
    },
    distributions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'HashboardDistribution',
        default: []
      }
    ],
    name: {
      type: String
    },
    description: {
      type: String
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

HashboardDeployment.plugin(mongooseTime())

export default mongoose.model('HashboardDeployment', HashboardDeployment)
