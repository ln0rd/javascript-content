import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const WebHookEvent = new Schema({
  name: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  model_id: {
    type: String,
    required: true
  },
  company_id: {
    type: String,
    required: true,
    index: true
  },
  old_status: {
    type: String
  },
  current_status: {
    type: String,
    required: true
  },
  payload: {
    type: String,
    required: true
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  }
})

WebHookEvent.index({
  company_id: 1,
  delivered: 1
})

WebHookEvent.index({
  company_id: 1,
  deleted: 1
})

WebHookEvent.index({
  company_id: 1,
  deleted: 1,
  model_id: 1
})

WebHookEvent.index({
  company_id: 1,
  delivered: 1,
  deleted: 1
})

WebHookEvent.index({
  created_at: 1
})

WebHookEvent.plugin(mongooseTime())

export default mongoose.model('WebHookEvent', WebHookEvent)
