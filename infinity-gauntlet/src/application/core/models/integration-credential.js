import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const IntegrationCredential = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    key: {
      type: String
    },
    username: {
      type: String
    },
    password: {
      type: String
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

IntegrationCredential.plugin(mongooseTime())

export default mongoose.model('IntegrationCredential', IntegrationCredential)
