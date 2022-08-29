import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose
const { ObjectId } = Schema

const Agreement = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  iso_id: {
    type: ObjectId,
    required: true
  }
})

Agreement.plugin(mongooseTime())

export default mongoose.model('Agreement', Agreement)
