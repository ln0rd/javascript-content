import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose
const { ObjectId } = Schema.Types

const PortifolioUserSchema = new Schema({
  _id: {
    type: ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String
  }
})

export const PortifolioSchema = new Schema({
  _id: {
    type: ObjectId,
    required: true,
    auto: true
  },
  client_id: {
    type: ObjectId,
    required: true
  },
  owner: PortifolioUserSchema,
  name: {
    type: String
  },
  description: {
    type: String
  },
  viewers: [PortifolioUserSchema]
})

PortifolioSchema.plugin(mongooseTime())

export default mongoose.model('Portfolio', PortifolioSchema)
