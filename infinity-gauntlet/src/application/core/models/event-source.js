import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const EventSource = new Schema(
  {
    enabled: {
      type: Boolean,
      required: true,
      default: true
    },
    name: {
      type: String,
      required: true,
      unique: true
    },
    label: {
      type: String
    },
    description: {
      type: String
    }
  },
  {
    usePushEach: true
  }
)

EventSource.plugin(mongooseTime())

export default mongoose.model('EventSource', EventSource)
