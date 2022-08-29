import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const InternalTransferRequest = new Schema(
  {
    model: {
      type: String
    },
    model_id: {
      type: String
    },
    transfer_id: {
      type: String,
      index: true
    },
    provider_model_id: {
      type: String
    },
    from_affiliation_id: {
      type: String
    },
    to_affiliation_id: {
      type: String
    },
    request_response: {
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

InternalTransferRequest.plugin(mongooseTime())

export default mongoose.model(
  'InternalTransferRequest',
  InternalTransferRequest
)
