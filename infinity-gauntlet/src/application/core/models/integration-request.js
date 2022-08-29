import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const IntegrationRequest = new Schema(
  {
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
    integration_response: {
      type: String
    },
    integration_body: {
      type: String
    },
    request_body: {
      type: String
    },
    status: {
      type: String,
      enum: ['success', 'failed']
    },
    company_id: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

IntegrationRequest.plugin(mongooseTime())

export default mongoose.model('IntegrationRequest', IntegrationRequest)
