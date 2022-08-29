import mongoose from 'mongoose'
import mongooseTimestampsPlugin from 'application/core/helpers/mongoose-timestamps-plugin'
import * as userValidationStatus from 'application/core/domain/user-validation-status'

const { Schema } = mongoose

const Permissions = new Schema(
  {
    company_id: {
      type: String,
      required: true
    },
    permission: {
      type: String,
      required: true,
      enum: ['admin', 'read_write', 'read_only', 'read_create_only']
    }
  },
  {
    usePushEach: true
  }
)

Permissions.plugin(mongooseTimestampsPlugin())

const User = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    document_number: {
      type: String
    },
    document_type: {
      type: String,
      enum: ['cnpj', 'cpf', 'passport'],
      lowercase: true
    },
    phone_number: {
      type: String
    },
    activation_token: {
      type: String
    },
    reset_password_token: {
      type: String
    },
    reset_password_token_expires_at: {
      type: Date
    },
    password_hash: {
      type: String
    },
    password_bcrypt_defined_by_user: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['pending_confirmation', 'active', 'disabled']
    },
    validation_status: {
      type: String,
      enum: userValidationStatus.userValidationStatusEnum,
      default: userValidationStatus.PENDING
    },
    user_metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    permissions: [Permissions],
    last_info_update: {
      type: Date
    }
  },
  {
    usePushEach: true
  }
)

User.index({
  email: 1,
  status: 1
})

User.pre('save', function(next) {
  // Ensure we're saving only the document digits removing mask and other characters.
  if (this.document_number) {
    this.document_number = this.document_number.replace(/\D/g, '')
  }

  next()
})

User.plugin(mongooseTimestampsPlugin())

export default mongoose.model('User', User)
