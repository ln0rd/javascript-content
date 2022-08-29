import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const WEBHOOK = 'webhook'
const INTEGRATION = 'integration'
const POSTPROCESS = 'postprocess' //generic postprocess action
const PREPROCESS = 'preprocess' //generic preprocess action
export const handlerTypes = [WEBHOOK, INTEGRATION, POSTPROCESS, PREPROCESS]

const { Schema } = mongoose

const VersionConfiguration = new Schema({
  handler_version: {
    type: String,
    required: true
  },
  version_match: {
    type: String,
    enum: ['exact', 'minimum', 'not'],
    required: true
  }
})

const EventHandler = new Schema(
  {
    handler_type: {
      type: String,
      enum: handlerTypes,
      required: true
    },
    version_configuration: {
      type: VersionConfiguration
    },
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
    description: {
      type: String
    },
    handler: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

EventHandler.plugin(mongooseTime())

export default mongoose.model('EventHandler', EventHandler)
