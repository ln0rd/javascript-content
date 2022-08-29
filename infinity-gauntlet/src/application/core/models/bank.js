import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Bank = new Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  ispbCode: {
    type: String,
    required: false,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
  },
  requireBranchDigit: {
    type: Boolean,
    required: true,
    default: false
  }
})

Bank.plugin(mongooseTime())

export default mongoose.model('Bank', Bank)
