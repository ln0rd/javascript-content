import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose

const Customer = new Schema(
  {
    name: {
      type: String
    },
    email: {
      type: String,
      required: true
    },
    document_number: {
      type: String
    },
    document_type: {
      type: String
    },
    birth_date: {
      type: Date
    },
    gender: {
      type: String,
      enum: ['M', 'F']
    },
    phone: {
      ddi: {
        type: String
      },
      ddd: {
        type: String
      },
      number: {
        type: String
      }
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

Customer.plugin(mongooseTime())
Customer.plugin(autoIncrement.plugin, {
  model: 'Customer',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Customer', Customer)
