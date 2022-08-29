import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const Permission = new Schema(
  {
    name: {
      type: String
    },
    description: {
      type: String
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    create: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PermissionResource',
        required: function() {
          return !(this.read || this.update || this.delete)
        },
        default: []
      }
    ],
    read: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PermissionResource',
        required: function() {
          return !(this.create || this.update || this.delete)
        },
        default: []
      }
    ],
    update: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PermissionResource',
        required: function() {
          return !(this.read || this.create || this.delete)
        },
        default: []
      }
    ],
    delete: [
      {
        type: Schema.Types.ObjectId,
        ref: 'PermissionResource',
        required: function() {
          return !(this.read || this.update || this.create)
        },
        default: []
      }
    ]
  },
  {
    usePushEach: true
  }
)

Permission.plugin(mongooseTime())

export default mongoose.model('Permission', Permission)
