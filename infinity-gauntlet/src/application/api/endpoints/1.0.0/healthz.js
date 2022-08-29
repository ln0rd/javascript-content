import moment from 'moment'
import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import { isRunning } from 'framework/core/helpers/shutdown'
import { connection } from 'framework/core/adapters/database'
import { getStatus as getQueueStatus } from 'framework/core/adapters/queue'
import { getStatus as getRedisStatus } from 'framework/core/adapters/redis'

const Logger = createLogger({ name: 'HEALTH_CHECK_ENDPOINT' })

export default class HealthzEndpoint {
  static base(req, res) {
    return Promise.resolve().then(respond)

    function respond() {
      const date = new Date()
      const uptime = moment(global.uptime).from()

      return res.json(200, {
        uptime,
        date
      })
    }
  }

  // check is a method to ping some depencies of IG and return if is ready or not.
  //
  // The idea with this endpoint is to have an external check by observability tools (e.g. Datadog)
  // and have an overview/alerts/insights of how the Hash API is doing; and all this without
  // restarting the cluster/k8s level.
  static externalCheck(req, res) {
    const DatabaseStatus = Boolean(connection.readyState)
    const QueueStatus = getQueueStatus()
    const RedisStatus = getRedisStatus()

    return Promise.resolve().then(respond)

    function respond() {
      const date = new Date()
      const uptime = moment(global.uptime).from()

      const serverStatus =
        DatabaseStatus && QueueStatus && RedisStatus ? 200 : 503

      if (serverStatus === 503) {
        Logger.error(
          {
            uptime,
            date: date.toISOString(),
            serverStatus,
            DatabaseStatus,
            QueueStatus
          },
          'healthCheckFailure'
        )
      }

      return res.json(serverStatus, {
        uptime,
        date
      })
    }
  }

  static readiness(req, res) {
    return HealthzEndpoint.base(req, res, isRunning, 'readiness')
  }

  static liveness(req, res) {
    return HealthzEndpoint.base(req, res, true, 'liveness')
  }
}
