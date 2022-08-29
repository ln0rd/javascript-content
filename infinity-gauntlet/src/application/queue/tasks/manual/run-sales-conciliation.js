import moment from 'moment'
import { createLogger } from '@hashlab/logger'
import { buildSaleConciliation } from 'conciliation'

const Logger = createLogger({ name: 'RUN_SALES_CONCILIATION_TASK' })

const LEO_MASTER = process.env.LEO_MASTER

export default class RunSalesConciliation {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const day = args ? args[0] : ''
    const isoId = LEO_MASTER || args[1]

    const dateToConciliate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day)
      ? day
      : moment()
          .subtract(1, 'days')
          .format('YYYY-MM-DD')

    try {
      await buildSaleConciliation(dateToConciliate, isoId)
    } catch (err) {
      Logger.error({ err }, 'run-sale-conciliation-task-error')
    }
  }
}
