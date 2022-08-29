import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'
import {
  captureMethodsEnum,
  paymentMethodsEnum
} from 'application/core/domain/methods'

export const PROCESSING = 'processing'
export const AUTHORIZED = 'authorized'
export const PAID = 'paid'
export const REFUNDED = 'refunded'
export const PENDING_REFUND = 'pending_refund'
export const CHARGEDBACK = 'chargedback'
export const WAITING_PAYMENT = 'waiting_payment'
export const REFUSED = 'refused'

const { Schema } = mongoose
const { ObjectId } = Schema

const SplitRule = new Schema(
  {
    amount: {
      type: Number
    },
    percentage: {
      type: Number
    },
    charge_processing_cost: {
      type: Boolean,
      default: true
    },
    liable: {
      type: Boolean
    },
    company_id: {
      type: String,
      required: true
    },
    affiliation_id: {
      type: String
    },
    transaction_id: {
      type: String
    },
    processed: {
      type: Boolean,
      default: false
    },
    provider_object_id: {
      type: String
    },
    is_provider_object_id_refunded: {
      type: Boolean,
      default: false
    }
  },
  {
    usePushEach: true
  }
)

const CardSchema = new Schema(
  {
    first_digits: {
      type: String
    },
    last_digits: {
      type: String
    },
    brand: {
      type: String
    },
    country: {
      type: String
    },
    holder_name: {
      type: String
    },
    valid: {
      type: String
    },
    expiration_date: {
      type: String
    }
  },
  {
    usePushEach: true
  }
)

// Boleto represents the transaction boleto information.
const Boleto = new Schema(
  {
    url: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

// ConsumerAddress represents the consumer address information for transaction.
const ConsumerAddress = new Schema({
  zipcode: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  street_number: {
    type: String,
    required: true
  },
  complement: {
    type: String
  },
  neighborhood: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  }
})

// Consumer represents the consumer information for transaction.
const Consumer = new Schema(
  {
    full_name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    document_type: {
      type: String,
      required: true,
      enum: ['CPF', 'CNPJ']
    },
    document_number: {
      type: String
    },
    phone: {
      type: String
    },
    date_of_birth: {
      type: String
    },
    address: ConsumerAddress
  },
  {
    usePushEach: true
  }
)

const Transaction = new Schema(
  {
    provider: {
      type: String,
      required: true,
      index: true
    },
    provider_id: {
      type: String
    },
    affiliation_id: {
      type: String
    },
    provider_transaction_id: {
      type: String,
      index: true,
      unique: true
    },
    charge_id: {
      type: String
    },
    order_id: {
      type: String
    },
    subscription_id: {
      type: String
    },
    mcc: {
      type: String
    },
    card: CardSchema,
    amount: {
      type: Number,
      required: true
    },
    total_fee: {
      type: Number
    },
    paid_amount: {
      type: Number
    },
    refunded_amount: {
      type: Number
    },
    status: {
      type: String,
      required: true,
      enum: [
        PROCESSING,
        AUTHORIZED,
        PAID,
        REFUNDED,
        PENDING_REFUND,
        CHARGEDBACK,
        WAITING_PAYMENT,
        REFUSED
      ]
    },
    acquirer_response_code: {
      type: String
    },
    acquirer_name: {
      type: String
    },
    boleto_barcode: {
      type: String
    },
    boleto_url: {
      type: String
    },
    boleto_expiration_date: {
      type: Date
    },
    capture_method: captureMethodsEnum,
    installments: {
      type: Number
    },
    payment_method: paymentMethodsEnum,
    postback_url: {
      type: String
    },
    soft_descriptor: {
      type: String
    },
    serial_number: {
      type: String
    },
    nsu: {
      type: String,
      default: null
    },
    tid: {
      type: String
    },
    metadata: {
      type: String,
      default: null
    },
    refunded_at: {
      type: String
    },
    acquirer_created_at: {
      type: String,
      index: true
    },
    status_reason: {
      type: String,
      enum: [
        'acquirer',
        'antifraud',
        'internal_error',
        'no_acquirer',
        'acquirer_timeout'
      ]
    },
    sak: {
      type: String
    },
    hardware_id: {
      type: String
    },
    split_origin: {
      type: String
    },
    split_rules: [SplitRule],
    is_split_rule_processed: {
      type: Boolean,
      default: false
    },
    captured_at: {
      type: String
    },
    company_id: {
      type: String,
      required: true,
      index: true
    },
    iso_id: {
      type: String,
      required: true,
      index: true
    },
    _company_partial: {
      name: {
        type: String,
        required: true
      },
      document_number: {
        type: String,
        required: true
      },
      full_name: {
        type: String
      },
      document_type: {
        type: String,
        required: true,
        enum: ['cnpj', 'cpf']
      },
      company_metadata: {},
      created_at: {
        type: Date
      }
    },
    captured_by: {
      type: String,
      index: true
    },
    // Acquirer account identifier which processed transaction
    acquirer_account_id: {
      type: String
    },
    portfolio: new Schema({
      _id: { type: ObjectId, required: true, index: true },
      owner: new Schema({
        _id: {
          type: ObjectId,
          required: true,
          index: true
        },
        name: {
          type: String
        }
      })
    }),
    antifraud_assessment_id: {
      type: String
    },
    consumer: Consumer,
    boleto: Boleto
  },
  {
    usePushEach: true
  }
)

Transaction.plugin(mongooseTime())
Transaction.plugin(autoIncrement.plugin, {
  model: 'Transaction',
  field: '_id',
  startAt: 1
})

Transaction.index(
  {
    provider: 1,
    provider_transaction_id: 1
  },
  { unique: true }
)

Transaction.index({
  status: 1,
  created_at: -1,
  acquirer_created_at: -1
})

Transaction.index({
  status: 1,
  acquirer_created_at: -1
})

Transaction.index({
  provider: 1,
  status: 1,
  is_split_rule_processed: 1,
  created_at: 1
})

Transaction.index(
  {
    serial_number: 'text',
    'card.last_digits': 'text',
    '_company_partial.name': 'text',
    '_company_partial.document_number': 'text'
  },
  {
    weights: {
      serial_number: 10,
      'card.last_digits': 5,
      '_company_partial.name': 5
    },
    name: 'transaction_search_text',
    default_language: 'pt'
  }
)

export default mongoose.model('Transaction', Transaction)
