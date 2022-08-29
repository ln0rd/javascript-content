import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const CaptureHardware = new Schema(
  {
    status: {
      type: String,
      enum: ['active', 'pending_activation', 'disabled'],
      required: true
    },
    provider: {
      type: String,
      required: true
    },
    software_provider: {
      type: String,
      enum: ['none', 'celer', 'hash_capture'],
      required: true
    },
    negotiation_type: {
      type: String,
      enum: ['sale', 'rent']
    },
    negotiation_amount: {
      type: Number
    },
    negotiation_installments: {
      type: Number
    },
    hardware_provider: {
      type: String,
      enum: ['verifone', 'ingenico', 'pax', 'gertec']
    },
    terminal_type: {
      type: String,
      enum: ['pos', 'mpos', 'tef'],
      required: true
    },
    terminal_model: {
      type: String,
      enum: [
        'vx685',
        'vx680',
        'd180',
        'd150',
        'mobipin10',
        'vx690',
        'iwl280',
        'move5000',
        'gpos400',
        'mp20',
        'ict250',
        'c680',
        'a920',
        's920',
        'd195',
        'd190',
        'd175'
      ],
      lowercase: true,
      required: true
    },
    serial_number: {
      type: String
    },
    logical_number: {
      type: String
    },
    provider_status_code: {
      type: Number
    },
    provider_status_message: {
      type: String
    },
    company_id: {
      type: String,
      required: true
    },
    stone: new Schema({
      SAK: String,
      stone_code: String
    })
  },
  {
    usePushEach: true
  }
)

CaptureHardware.index({
  logical_number: 1,
  status: 1
})

CaptureHardware.index({
  company_id: 1,
  created_at: -1
})

CaptureHardware.plugin(mongooseTime())

export default mongoose.model('CaptureHardware', CaptureHardware)
