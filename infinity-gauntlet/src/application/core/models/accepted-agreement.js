import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose
const { ObjectId } = Schema

const AcceptedAgreement = new Schema({
  agreement_id: {
    type: ObjectId,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['user', 'company'], //by now, only company is going to be used, but user acceptance is something fairly common
    required: true
  },
  entity_id: {
    type: ObjectId,
    required: true
  },
  user_ip: {
    type: String,
    required: true
  },
  user_agent: {
    type: String,
    required: true
  }
})

AcceptedAgreement.plugin(mongooseTime())

export default mongoose.model('AcceptedAgreement', AcceptedAgreement)
