import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

export const FAILED = 'failed'
export const SUCCESSFUL = 'successful'
export const status = [FAILED, SUCCESSFUL]

const ManualTaskHistory = new Schema(
  {
    task: {
      type: String,
      required: true
    },
    args: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: status,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

ManualTaskHistory.plugin(mongooseTime())

export default mongoose.model('ManualTaskHistory', ManualTaskHistory)
