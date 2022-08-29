import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

export const FAILED_TO_TRIGGER = 'failed_to_trigger'
export const FAILED_TO_HANDLE = 'failed_to_handle'
export const FAILED = 'failed'
export const TRIGGERED = 'triggered'
export const HANDLED = 'handled'
export const IN_PROGRESS = 'in_progress'

const statuses = [
  FAILED_TO_TRIGGER,
  FAILED_TO_HANDLE,
  FAILED,
  TRIGGERED,
  HANDLED,
  IN_PROGRESS
]

const TriggeredEvent = new Schema(
  {
    triggered_company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    event_handler: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'EventHandler'
    },
    event_source: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'EventSource'
    },
    args: {
      type: Schema.Types.Mixed,
      default: {}
    },
    handler_version: {
      type: String,
      required: function() {
        return this.status === 'triggered'
      }
    },
    status: {
      type: String,
      required: true,
      enum: statuses
    },
    status_history: [
      {
        type: String,
        required: true,
        default: []
      }
    ],
    retry_attempts: {
      type: Number,
      default: 0
    }
  },
  {
    usePushEach: true
  }
)

TriggeredEvent.plugin(mongooseTime())

export default mongoose.model('TriggeredEvent', TriggeredEvent)
