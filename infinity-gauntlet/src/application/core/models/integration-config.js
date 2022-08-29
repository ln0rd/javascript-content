import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const IntegrationConfig = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    variables: {}
  },
  {
    usePushEach: true
  }
)

IntegrationConfig.plugin(mongooseTime())

export default mongoose.model('IntegrationConfig', IntegrationConfig)
