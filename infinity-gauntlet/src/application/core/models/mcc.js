import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Mcc = new Schema({
  mcc: {
    type: String,
    required: true,
    unique: true
  },
  cnae: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
  }
})

Mcc.plugin(mongooseTime())

export default mongoose.model('Mcc', Mcc)
