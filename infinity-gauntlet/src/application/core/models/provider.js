import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import * as cardBrands from 'application/core/domain/card-brands'

const { Schema } = mongoose

const FeeSchema = new Schema(
  {
    debit: {
      type: Number
    },
    credit_1: {
      type: Number
    },
    credit_2: {
      type: Number
    },
    credit_7: {
      type: Number
    }
  },
  {
    usePushEach: true
  }
)

const BrandsSchema = new Schema(
  {
    brand: {
      type: String,
      enum: cardBrands.names(),
      required: true
    },
    fee: FeeSchema
  },
  {
    usePushEach: true
  }
)

const AcquirerCredentialSchema = new Schema(
  {
    primary: {
      type: Boolean,
      default: false
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    },
    merchant_id: {
      type: String,
      required: true
    },
    affiliation_key: {
      type: String,
      required: true
    },
    enabled_mccs: [
      {
        type: String
      }
    ],
    enabled_capture_methods: [
      {
        type: String,
        enum: ['emv', 'ecommerce', 'magstripe']
      }
    ],
    enabled_payment_methods: [
      {
        type: String,
        enum: ['credit_card', 'debit_card']
      }
    ],
    enabled_card_brands: [
      {
        type: String,
        enum: cardBrands.names()
      }
    ],
    pricing: {
      anticipation_cost: {
        type: Number,
        required: true
      },
      brands: [BrandsSchema]
    },
    login: {
      type: String
    }
  },
  {
    usePushEach: true
  }
)

const AcquirerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['stone', 'rede', 'cielo', 'getnet', 'pagseguro', 'vero']
    },
    priority: {
      type: Number,
      required: true,
      default: 1
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    },
    credentials: [AcquirerCredentialSchema]
  },
  {
    usePushEach: true
  }
)

const Provider = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    provider_type: {
      type: String,
      required: true,
      enum: ['acquirer', 'subacquirer']
    },
    enabled: {
      type: Boolean,
      default: true,
      required: true
    },
    bank_provider: {
      name: {
        type: String,
        enum: ['neon']
      },
      credentials: {},
      neon_credentials: {
        auth_token: String,
        auth_username: String,
        auth_password: String,
        rsa_public_key: {
          format: String,
          value: String
        },
        rsa_private_key: {
          format: String,
          value: String
        }
      }
    },
    acquirers: [AcquirerSchema]
  },
  {
    usePushEach: true
  }
)

Provider.plugin(mongooseTime())

export default mongoose.model('Provider', Provider)
