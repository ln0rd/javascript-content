import moment from 'moment-timezone'
import config from 'application/core/config'
import { createLogger } from '@hashlab/logger'
import {
  buildDebtTransferConciliation,
  buildSettlementConciliation
} from 'conciliation'

const Logger = createLogger({ name: 'RUN_SETTLEMENTS_CONCILIATION_TASK' })

const LEO_MASTER = process.env.LEO_MASTER

export default class RunSettlementsConciliation {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const day = args ? args[0] : ''
    const isoId = LEO_MASTER || args[1]

    const dayToConciliate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)
      ? day
      : moment()
          .tz(config.timezone)
          .format('YYYY-MM-DD')

    try {
      await buildSettlementConciliation(dayToConciliate, isoId)
      await buildDebtTransferConciliation(dayToConciliate, isoId)
    } catch (err) {
      Logger.error({ err }, 'build-settlement-conciliation-task-error')
    }
  }
}
