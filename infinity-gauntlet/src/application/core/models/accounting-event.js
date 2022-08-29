import mongoose, { model } from 'mongoose'

const { Schema } = mongoose

const AccountingEventSchema = new Schema(
  {
    event_name: String,
    event_id: { type: String, unique: true }, // We cannot allow duplicate IDs to be sent to MetaAcc, or they will be ignored.
    status: {
      type: String,
      enum: ['unprocessed', 'processing', 'processed']
    },
    originating_system: String,
    originating_model: String,
    originating_model_id: String,
    iso_id: String,
    merchant_id: String,
    amount_cents: Number,
    date: Date
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
)

export default model('AccountingEvent', AccountingEventSchema)
