import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const ApiKey = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true
    },
    secret: {
      type: String,
      required: true
    },
    masked_secret: {
      type: String,
      required: true
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
        required: true
      }
    ],
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
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
      default: true,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

ApiKey.plugin(mongooseTime())

export default mongoose.model('ApiKey', ApiKey)
