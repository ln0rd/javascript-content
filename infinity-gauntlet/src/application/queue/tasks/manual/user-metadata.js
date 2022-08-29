import Promise from 'bluebird'
import User from 'application/core/models/user'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'USER_METADATA' })

export default class UserMetadata {
  static type() {
    return 'manual'
  }

  static handler(args) {
    return Promise.resolve()
      .then(updateUsers)
      .then(messageLog)

    function updateUsers() {
      return User.updateMany(
        { user_metadata: { $exists: false } },
        { $set: { user_metadata: {} } }
      )
    }

    function messageLog() {
      Logger.info(args)
      Logger.info('User metadata task is done!')
    }
  }
}
