import Promise from 'bluebird'
import co from 'co'
import R from 'ramda'
import Company from 'application/core/models/company'
import createLogger from 'framework/core/adapters/logger'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'

const taskName = 'PRUNE_COMPANIES_USERS'
const Logger = createLogger({ name: taskName })

export default class PruneCompaniesUsers {
  static type() {
    return 'manual'
  }

  static handler() {
    const companiesToSave = []
    let prunedUsersCount = 0

    return Promise.resolve()
      .then(pruneUsers)
      .then(saveCompanies)
      .then(respond)

    function pruneUsers() {
      let removedUsersCount
      let prunedUsers

      Logger.info({}, "Started pruning companies' users")

      return co(function*() {
        const cursor = Company.find({}).cursor()
        let company = yield cursor.next()

        for (
          company = yield cursor.next();
          company !== null;
          company = yield cursor.next()
        ) {
          prunedUsers = R.uniq(R.map(user => user.toString(), company.users))
          removedUsersCount = company.users.length - prunedUsers.length

          if (removedUsersCount > 0) {
            company.users = prunedUsers
            companiesToSave.push(company.save())

            Logger.info(
              {},
              `Company: ${
                company._id
              }: removed ${removedUsersCount} repeated users`
            )

            prunedUsersCount += removedUsersCount
          }
        }

        //eslint-disable-next-line
        return ManualTaskHistory.create({
          task: taskName,
          status: SUCCESSFUL,
          args: prunedUsersCount
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

    function saveCompanies() {
      return Promise.all(companiesToSave)
    }

    function respond() {
      Logger.info(
        {},
        `Pruned ${prunedUsersCount} repeated users from ${
          companiesToSave.length
        } companies`
      )
      return {
        prunedUsers: prunedUsersCount,
        companies: companiesToSave.length
      }
    }
  }
}
