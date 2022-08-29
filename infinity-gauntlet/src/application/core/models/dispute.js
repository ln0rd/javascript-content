import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Dispute = new Schema({
  transaction_id: {
    type: Number,
    required: true
  }
})

Dispute.plugin(mongooseTime())

export default mongoose.model('Dispute', Dispute)
