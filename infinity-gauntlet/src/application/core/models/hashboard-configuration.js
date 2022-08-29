import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'

const { Schema } = mongoose

const HashboardConfiguration = new Schema(
  {},
  {
    usePushEach: true
  }
)

HashboardConfiguration.plugin(mongooseTime())

export default mongoose.model('HashboardConfiguration', HashboardConfiguration)
