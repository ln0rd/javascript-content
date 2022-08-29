import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Permits = new Schema(
  {
    create: [
      {
        type: String
      }
    ],
    read: [
      {
        type: String
      }
    ],
    update: [
      {
        type: String
      }
    ],
    delete: [
      {
        type: String
      }
    ]
  },
  {
    usePushEach: true
  }
)

const PermissionResource = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    description: {
      type: String
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true
    },
    public: {
      type: Boolean,
      default: true,
      required: true
    },
    permits: {
      type: Permits
    }
  },
  {
    usePushEach: true
  }
)

PermissionResource.plugin(mongooseTime())

export default mongoose.model('PermissionResource', PermissionResource)
