import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const WebHookDelivery = new Schema({
  event: {
    type: String,
    required: true
  },
  event_id: {
    type: String,
    required: true
  },
  status_code: {
    type: Number
  },
  status_text: {
    type: String
  },
  url: {
    type: String
  },
  payload: {
    type: String
  },
  config: {
    type: String
  },
  headers: {
    type: String
  },
  response: {
    type: String
  }
})

WebHookDelivery.index({
  created_at: 1
})

WebHookDelivery.index({
  event_id: 1
})

WebHookDelivery.plugin(mongooseTime())

export default mongoose.model(
  'WebHookDelivery',
  WebHookDelivery,
  'webhookdeliveries'
)
