import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Hashboard = new Schema(
  {
    deployments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'HashboardDeployment',
        required: true,
        default: []
      }
    ],
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    type: {
      type: String,
      required: true,
      default: 'admin',
      enum: ['admin', 'merchant']
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    },
    configuration: {
      type: Schema.Types.ObjectId,
      ref: 'HashboardConfiguration'
    }
  },
  {
    usePushEach: true
  }
)

Hashboard.plugin(mongooseTime())

export default mongoose.model('Hashboard', Hashboard)
