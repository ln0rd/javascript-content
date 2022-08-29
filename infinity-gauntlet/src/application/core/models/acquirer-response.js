import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const AcquirerResponse = new Schema({
  acquirer: {
    type: String,
    required: true,
    default: 'stone'
  },
  response_code: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['acquirer', 'issuer']
  }
})

AcquirerResponse.plugin(mongooseTime())

export default mongoose.model('AcquirerResponse', AcquirerResponse)
