import Promise from 'bluebird'
import co from 'co'
import R from 'ramda'
import User from 'application/core/models/user'
import createLogger from 'framework/core/adapters/logger'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'

const taskName = 'PRUNE_USERS_PERMISSIONS'
const Logger = createLogger({ name: taskName })

export default class PruneUsersPermissions {
  static type() {
    return 'manual'
  }

  static handler() {
    const usersToSave = []
    let prunedPermissionsCount = 0

    return Promise.resolve()
      .then(pruneUsers)
      .then(saveUsers)
      .then(respond)

    function pruneUsers() {
      let removedPermissionsCount
      let prunedPermissions

      Logger.info({}, "Started pruning user's permissions")

      return co(function*() {
        const cursor = User.find({}).cursor()
        let user = yield cursor.next()

        for (
          user = yield cursor.next();
          user !== null;
          user = yield cursor.next()
        ) {
          prunedPermissions = R.reduce(
            (result, permission) => {
              if (
                R.find(
                  ({ company_id }) =>
                    permission.company_id.toString() === company_id.toString(),
                  result
                )
              ) {
                return result
              }
              return R.concat(result, [permission])
            },
            [],
            user.permissions
          )

          removedPermissionsCount =
            user.permissions.length - prunedPermissions.length

          if (removedPermissionsCount > 0) {
            user.permissions = prunedPermissions
            usersToSave.push(user.save())

            Logger.info(
              {},
              `User: ${
                user._id
              }: removed ${removedPermissionsCount} repeated permissions`
            )

            prunedPermissionsCount += removedPermissionsCount
          }
        }

        //eslint-disable-next-line
        return ManualTaskHistory.create({
          task: taskName,
          status: SUCCESSFUL,
          args: prunedPermissionsCount
        }).catch(err => {
          Logger.error({ err }, 'ManualTaskHistoryError')
        })
      }).catch(err => {
        Logger.error({ err }, 'userPruneError')
        return ManualTaskHistory.create({
          task: taskName,
          status: FAILED,
          args: ''
        })
      })
    }

    function saveUsers() {
      return Promise.all(usersToSave)
    }

    function respond() {
      Logger.info(
        {},
        `Pruned ${prunedPermissionsCount} repeated permissions from ${
          usersToSave.length
        } users`
      )
      return {
        prunedPermissions: prunedPermissionsCount,
        users: usersToSave.length
      }
    }
  }
}
