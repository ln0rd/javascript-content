import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const HashboardUrl = new Schema({
  url: {
    type: String,
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
  },
  hashboard: {
    type: Schema.Types.ObjectId,
    ref: 'Hashboard',
    required: true
  }
})

HashboardUrl.plugin(mongooseTime())

export default mongoose.model('HashboardUrl', HashboardUrl)
