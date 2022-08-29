import mongoose from 'mongoose'
import config from 'framework/core/config'
import autoIncrement from 'mongoose-auto-increment-fix'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'DATABASE_ADAPTER' })

export let database = mongoose
export let connection = null

export function connectDatabase() {
  connection = mongoose.connection

  // There are several deprecations in the MongoDB Node.js driver that Mongoose users should be aware of.
  // To fix all deprecation warnings, follow the below steps
  // mongoose.set('useNewUrlParser', true);
  // mongoose.set('useFindAndModify', false);
  // mongoose.set('useCreateIndex', true);
  // mongoose.set('useUnifiedTopology', true);
  // Replace update() with updateOne(), updateMany(), or replaceOne()
  // Replace remove() with deleteOne() or deleteMany().
  // Replace count() with countDocuments(), unless you want to count how many documents are in the whole collection (no filter).
  // In the latter case, use estimatedDocumentCount().
  // Source: https://mongoosejs.com/docs/deprecations.html v5.12.3
  mongoose.set('useNewUrlParser', true)
  mongoose.set('useFindAndModify', false)
  mongoose.set('useCreateIndex', true)
  mongoose.set('useUnifiedTopology', true)

  connection.on('connecting', () => {
    Logger.info(
      {
        context: { connectTimeoutMS: config.core.mongodb.opts.connectTimeoutMS }
      },
      'Connecting to the MongoDB.'
    )
  })

  connection.on('connected', () => {
    Logger.info('MongoDB connection established successfully.')
  })

  connection.on('open', () => {
    Logger.info('The application is now using the MongoDB connection.')
  })

  connection.on('reconnected', () => {
    Logger.info('MongoDB connection reestablished successfully.')
  })

  connection.on('error', err => {
    Logger.error({ err }, 'Error in MongoDB connection: %s')
  })

  connection.on('disconnected', () => {
    Logger.warn('MongoDB connection was lost.')
  })

  autoIncrement.initialize(connection)

  return mongoose.connect(config.core.mongodb.uri, config.core.mongodb.opts)
}

export function closeConnection() {
  if (!database) {
    return null
  }

  // eslint-disable-next-line promise/avoid-new
  return new Promise(resolve => {
    database.connection.close(() => {
      Logger.warn('Database connection closed due to application termination.')

      return resolve()
    })
  })
}
