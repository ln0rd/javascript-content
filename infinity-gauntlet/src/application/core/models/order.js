import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose

const ItemsSchema = new Schema({
  name: {
    type: String
  },
  description: {
    type: String
  },
  image_url: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  }
})

const Order = new Schema({
  provider: {
    type: String
  },
  provider_id: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  paid_amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'pending_payment', 'paid', 'canceled']
  },
  allowed_payment_methods: [
    {
      type: String,
      enum: ['credit_card', 'paypal']
    }
  ],
  max_installments: {
    type: Number
  },
  owner_document_number: {
    type: String
  },
  owner_model: {
    type: String
  },
  owner_model_id: {
    type: String
  },
  orphan: {
    type: Boolean,
    default: false
  },
  items_count: {
    type: Number,
    required: true
  },
  items: [ItemsSchema],
  payments: [
    {
      type: String
    }
  ],
  parent_id: {
    type: String
  },
  company_id: {
    type: String
  }
})

Order.plugin(mongooseTime())
Order.plugin(autoIncrement.plugin, {
  model: 'Order',
  field: '_id',
  startAt: 1
})

export default mongoose.model('Order', Order)
