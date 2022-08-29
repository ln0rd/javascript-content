import mongoose from 'mongoose'
import * as cardBrands from 'application/core/domain/card-brands'
import { companyStatusEnum } from 'application/core/domain/company-status'
import mongooseTimestampsPlugin from 'application/core/helpers/mongoose-timestamps-plugin'

const { Schema } = mongoose
const { ObjectId } = Schema

const InstallmentsSchema = new Schema(
  {
    installment: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    fee: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['percentage', 'amount'],
      default: 'percentage'
    }
  },
  {
    usePushEach: true
  }
)

const HierarchySchema = new Schema(
  {
    data: {
      type: []
    },
    user: {
      type: String
    },
    editing: {
      type: Boolean,
      default: false
    },
    edit_time: {
      type: Number
    }
  },
  {
    usePushEach: true
  }
)

const MdrsSchema = new Schema(
  {
    capture_method: {
      type: String,
      enum: ['default', 'ecommerce', 'emv']
    },
    payment_method: {
      type: String,
      enum: ['default', 'credit_card', 'boleto', 'debit_card']
    },
    card_brand: {
      type: String,
      enum: cardBrands.names().concat(['default'])
    },
    installments: [InstallmentsSchema]
  },
  {
    usePushEach: true
  }
)

export const BANK_ACCOUNT_TYPE = [
  'conta_corrente',
  'conta_poupanca',
  'conta_corrente_conjunta',
  'conta_poupanca_conjunta'
]

const BankAccount = new Schema(
  {
    bank_code: {
      type: String,
      required: true
    },
    agencia: {
      type: String,
      required: true
    },
    agencia_dv: {
      type: String
    },
    conta: {
      type: String,
      required: true
    },
    conta_dv: {
      type: String
    },
    type: {
      type: String,
      required: true,
      default: 'conta_corrente',
      enum: BANK_ACCOUNT_TYPE
    },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'valid', 'invalid']
    },
    document_type: {
      type: String,
      enum: ['cnpj', 'cpf']
    },
    document_number: {
      type: String,
      required: true
    },
    legal_name: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

const CostsSchema = new Schema(
  {
    anticipation_fee: {
      type: Number,
      required: true
    },
    mdrs: [MdrsSchema]
  },
  {
    usePushEach: true
  }
)

const EventSchema = new Schema({
  event_handler: {
    type: Schema.Types.ObjectId,
    ref: 'EventHandler',
    required: true
  },
  event_source: {
    type: Schema.Types.ObjectId,
    ref: 'EventSource',
    required: true
  },
  enabled: {
    type: Boolean,
    required: true,
    default: true
  },
  priority: {
    type: Number,
    default: 0,
    minimum: -20,
    maximum: 19
  },
  inheritable: {
    type: Boolean,
    required: true,
    default: false
  }
})

const AddressSchema = new Schema(
  {
    street: {
      type: String,
      required: true
    },
    street_number: {
      type: String
    },
    complement: {
      type: String
    },
    neighborhood: {
      type: String,
      required: true
    },
    zipcode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: '076'
    },
    state: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

const ContactSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      index: true
    },
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    }
  },
  {
    usePushEach: true
  }
)

const AppKeySchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    app_key: {
      type: String,
      required: true
    }
  },
  {
    usePushEach: true
  }
)

const SplitRule = new Schema(
  {
    percentage: {
      type: Number,
      required: true
    },
    charge_processing_cost: {
      type: Boolean,
      default: false
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

const Company = new Schema(
  {
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Permission',
        required: true,
        default: []
      }
    ],
    // This must be temporary
    // Waiting for: https://github.com/hashlab/infinity-gauntlet/issues/167
    id_str: {
      type: String
    },
    name: {
      type: String,
      required: true,
      index: true
    },
    document_number: {
      type: String,
      required: true,
      index: true
    },
    company_logo: {
      type: String
    },
    logo_url: {
      type: String
    },
    document_type: {
      type: String,
      required: true,
      enum: ['cnpj', 'cpf']
    },
    transfer_configurations: {
      automatic_transfer_enabled: {
        type: Boolean,
        default: true
      },
      transfer_frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
      },
      transfer_date: {
        type: Number,
        min: 1,
        default: 1
      },
      // Rail identifies which kind of payout rail the payment will be processed, in other words,
      // how we are going to make out the payout for example a pix, ted or other types of transfers.
      rail: {
        type: String,
        default: 'pix',
        enum: ['ted', 'pix', 'hash', 'external'],
        required: false
      }
    },
    partner_id: {
      type: Number
    },
    mcc: {
      type: String
    },
    full_name: {
      type: String
    },
    contact: ContactSchema,
    provider_contact: ContactSchema,
    estimated_monthly_tpv: {
      type: Number
    },
    status: {
      type: String,
      required: true,
      enum: ['pending_confirmation', 'pending_activation', 'active', 'inactive']
    },
    statusV2: {
      type: String,
      enum: companyStatusEnum
    },
    hash_key: {
      type: String,
      required: true,
      index: true
    },
    default_payment_provider: {
      type: String
    },
    app_keys: [AppKeySchema],
    webhook_configs: {
      enabled: {
        type: Boolean,
        default: false
      },
      secret: {
        type: String
      },
      url: {
        type: String
      },
      events: [
        {
          type: String,
          enum: [
            'test',
            'acquisition_status_update',
            'acquisition_order_status_updated',
            'affiliation_approved',
            'affiliation_rejected',
            'anticipation_anticipated',
            'anticipation_failed',
            'anticipation_created',
            'bank_account_rejected',
            'bank_account_accepted',
            'company_status_updated',
            'payout_pending',
            'payout_in_transit',
            'payout_failed',
            'payout_paid',
            'settlement_created',
            'terminal_enabled',
            'terminal_disabled',
            'transaction_created',
            'transaction_paid',
            'transaction_refused',
            'transaction_refunded',
            'transaction_chargedback',
            'transaction_chargeback_payables_created',
            'transaction_refund_payables_created',
            'transaction_payables_created'
          ]
        }
      ]
    },
    users: [
      {
        type: ObjectId,
        ref: 'User'
      }
    ],
    providers: [
      {
        type: ObjectId,
        ref: 'Provider'
      }
    ],
    site_url: {
      type: String
    },
    recipient_id: {
      type: String
    },
    main_capture_method: {
      type: String,
      required: true,
      default: 'pos',
      enum: ['pos', 'mpos', 'tef', 'ecommerce']
    },
    capture_method_hardware_owner: {
      type: String,
      required: true,
      default: 'company',
      enum: ['company', 'provider']
    },
    email_configurations: {
      custom_domain_enabled: { type: Boolean, default: false },
      custom_domain: { type: String },
      send_activation_email: { type: Boolean, default: false }
    },
    default_password: {
      type: String
    },
    settlement_type: {
      type: String,
      enum: ['prepaid_card', 'bank_account'],
      default: 'bank_account'
    },
    bank_account: BankAccount,
    costs: CostsSchema,
    address: AddressSchema,
    shipping_address: AddressSchema,
    default_split_rules: [SplitRule],
    parent_id: {
      type: String
    },
    primary: {
      type: Boolean,
      required: true
    },
    anticipation_type: {
      type: String,
      enum: ['spot', 'automatic'],
      default: 'spot'
    },
    anticipation_day_start: {
      type: Number
    },
    anticipation_days_interval: {
      type: Number,
      default: 1
    },
    default_prepaid_card_recipient_id: {
      type: String
    },
    default_anticipation_recipient_id: {
      type: String
    },
    pos_metacontent_id: {
      type: String
    },
    company_metadata: {},
    metadata: {
      type: String,
      default: '{}'
    },
    portfolio: {
      type: ObjectId
    },
    hierarchy: {
      type: HierarchySchema
    },
    enabled_features: new Schema({
      /**
       * Portfolio is a group of companies
       * If this is enabled:
       * 1. The merchant's registered transactions will NOT skip the triggered task AssignPortfolioToTransaction
       */
      portfolio: Boolean
    }),
    registered_events: [EventSchema]
  },
  {
    usePushEach: true,
    collation: { locale: 'pt' }
  }
)

Company.index({
  id_str: 1
})

Company.index({
  parent_id: 1,
  created_at: -1
})

Company.index({
  created_at: -1
})

Company.index({
  created_at: 1
})

Company.index({
  'company_metadata.master': 1,
  parent_id: 1
})

Company.index({
  'company_metadata.regional': 1,
  parent_id: 1
})

Company.index({
  portfolio: 1
})

Company.index(
  {
    full_name: 'text',
    name: 'text',
    document_number: 'text',
    'contact.name': 'text',
    'contact.email': 'text',
    'company_metadata.salesman_name': 'text'
  },
  {
    name: 'company_search_text',
    weights: {
      document_number: 10,
      name: 10,
      full_name: 5
    },
    default_language: 'pt'
  }
)

Company.index({
  'contact.email': 1
})

Company.index({
  'company_metadata.salesman_name': 1
})

Company.index({
  parent_id: 1,
  'company_metadata.is_loja_leo': 1,
  created_at: -1
})

const idLeo = '5cf141b986642840656717f0'
const idNeon = '6022e1709af07f00063e12fc'
const idMobbi = '59dcd1f57033b90004b32339'

Company.pre('save', function(next) {
  this.id_str = this._id.toString()

  if (![idLeo, idNeon, idMobbi].includes(this.parent_id)) {
    this.anticipation_type = 'spot'
  }

  next()
})

Company.plugin(mongooseTimestampsPlugin())

export default mongoose.model('Company', Company)
