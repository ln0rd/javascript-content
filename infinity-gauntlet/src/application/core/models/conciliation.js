import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import autoIncrement from 'mongoose-auto-increment-fix'

const { Schema } = mongoose

const SplitRule = new Schema(
  {
    _id: {
      type: 'ObjectId'
    },
    amount: {
      type: 'Number'
    },
    company_id: {
      type: 'ObjectId'
    }
  },
  {
    usePushEach: true
  }
)

const Transaction = new Schema(
  {
    _id: {
      type: 'Number'
    },
    updated_at: {
      type: 'Date'
    },
    created_at: {
      type: 'Date'
    },
    acquirer_created_at: {
      type: 'Date'
    },
    installments: {
      type: 'Number'
    },
    payment_method: {
      type: String,
      required: true,
      enum: ['credit_card', 'debit_card', 'boleto', 'money']
    },
    status: {
      type: String,
      required: true,
      enum: [
        'processing',
        'authorized',
        'paid',
        'refunded',
        'pending_refund',
        'chargedback',
        'waiting_payment',
        'refused'
      ]
    },
    company_id: {
      type: 'ObjectId'
    },
    card: {
      first_digits: {
        type: 'String'
      },
      last_digits: {
        type: 'String'
      },
      brand: {
        type: 'String'
      },
      _id: {
        type: 'ObjectId'
      }
    },
    merchant_split: SplitRule,
    split_rules: {
      type: [SplitRule]
    },
    nsu: {
      type: String,
      default: null
    },
    origin_company: {
      _id: {
        type: 'ObjectId'
      },
      document_number: {
        type: 'String'
      }
    }
  },
  {
    usePushEach: true
  }
)

const Header = new Schema(
  {
    register_type: {
      type: 'String'
    },
    issue_file_date: {
      type: 'Date'
    },
    acquirer_identifier: {
      type: 'String'
    },
    file_identifier: {
      type: 'String'
    },
    company_document: {
      type: 'String'
    },
    company_name: {
      type: 'String'
    },
    acquirer_code: {
      type: 'Date'
    },
    status_type: {
      type: 'String'
    },
    currency: {
      type: 'String'
    },
    file_id: {
      type: 'Number'
    }
  },
  {
    usePushEach: true
  }
)

const Trailer = new Schema(
  {
    type_record: {
      type: 'String'
    },
    content_length: {
      type: 'Number'
    }
  },
  {
    usePushEach: true
  }
)

const Turnover = new Schema(
  {
    register_type: {
      type: 'String'
    },
    transaction_date: {
      type: 'Date'
    },
    transaction_time: {
      type: 'Date'
    },
    transaction_type: {
      type: 'String'
    },
    operation_code: {
      type: 'String'
    },
    gross_transaction_amount: {
      type: 'Number'
    },
    cost_gross_amount: {
      type: 'Number'
    },
    installment_number: {
      type: 'Number'
    },
    total_installments: {
      type: 'Number'
    },
    net_transaction_amount: {
      type: 'Number'
    },
    gross_installment_amount: {
      type: 'Number'
    },
    installment_cost_amount: {
      type: 'Number'
    },
    installment_net_amount: {
      type: 'Number'
    },
    last_installment_payment_date: {
      type: 'Date'
    },
    card_number: {
      type: 'String'
    },
    card_brand: {
      type: 'Number'
    },
    nsu: {
      type: 'Number'
    },
    order_code: {
      type: 'Number'
    },
    tid: {
      type: 'Number'
    },
    authorization_code: {
      type: 'String'
    },
    capture_type: {
      type: 'String'
    },
    bank_code: {
      type: 'String'
    },
    bank_agency: {
      type: 'String'
    },
    bank_account: {
      type: 'String'
    },
    original_nsu: {
      type: 'Number'
    },
    original_order_code: {
      type: 'Number'
    },
    original_payment_date: {
      type: 'Date'
    },
    refund_reason: {
      type: 'String'
    },
    pos_rent_amount: {
      type: 'Number'
    },
    has_average_ticket: {
      type: 'Number'
    },
    percentage_applied: {
      type: 'Number'
    },
    operation_summary: {
      type: 'String'
    },
    pdv: {
      type: 'String'
    }
  },
  {
    usePushEach: true
  }
)

const Payout = new Schema(
  {
    _id: {
      type: 'Number'
    },
    amount: {
      type: 'Number'
    },
    destination: {
      agencia: {
        type: 'String'
      },
      bank_code: {
        type: 'String'
      },
      conta: {
        type: 'String'
      }
    },
    date: {
      type: 'String'
    },
    company_id: {
      type: 'String'
    }
  },
  {
    usePushEach: true
  }
)

const Payable = new Schema(
  {
    _id: {
      type: 'String'
    },
    transaction_id: {
      type: 'Number'
    },
    installment: {
      type: 'Number'
    },
    total_installments: {
      type: 'Number'
    },
    transaction_amount: {
      type: 'Number'
    },
    origin_company_id: {
      type: 'String'
    },
    company_id: {
      type: 'String'
    },
    amount: {
      type: 'Number'
    },
    cost: {
      type: 'Number'
    },
    fee: {
      type: 'Number'
    },
    payment_date: {
      type: 'String'
    },
    mdr_cost: {
      type: 'Number'
    },
    settlement_id: {
      type: 'String'
    },
    original_payment_date: {
      type: 'Date'
    },
    owner_company_id: {
      type: 'ObjectId'
    },
    transaction: Transaction,
    payout: Payout,
    status: {
      type: 'String'
    },
    type: {
      type: 'String'
    }
  },
  {
    usePushEach: true
  }
)

const Conciliation = new Schema(
  {
    type: {
      type: String,
      enum: ['sales', 'settlements'],
      required: true
    },
    company_id: {
      type: 'String',
      required: true
    },
    date: {
      type: 'String',
      required: true
    },
    company_data: {
      _id: {
        type: 'ObjectId'
      },
      document_number: {
        type: 'String'
      },
      name: {
        type: 'String'
      },
      payables: [Payable]
    },
    conciliated: {
      header: Header,
      turnover: [Turnover],
      trailer: Trailer,
      sequential_file: {
        type: 'String'
      },
      csv_file: {
        type: 'String'
      }
    },
    sent_email: {
      type: Boolean,
      default: false
    }
  },
  {
    usePushEach: true
  }
)

Conciliation.plugin(mongooseTime())
Conciliation.plugin(autoIncrement.plugin, {
  model: 'Conciliation',
  field: '_id',
  startAt: 1
})

Conciliation.index(
  {
    type: 1,
    company_id: 1,
    date: 1
  },
  { unique: true }
)

export default mongoose.model('Conciliation', Conciliation)
