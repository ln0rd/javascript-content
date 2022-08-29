import moment from 'moment-timezone'
import createLogger from 'framework/core/adapters/logger'
import getUniqueId from 'application/core/helpers/unique-id'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'

const Logger = createLogger({ name: 'PROCESS_SETTLEMENTS_DEBTS' })

export default class ManualProcessSettlementsDebts {
  static type() {
    return 'manual'
  }

  static async handler() {
    const executionId = getUniqueId()
    const executionStartedAt = moment()
      .tz('America/Sao_Paulo')
      .format()
    const date = moment().format('YYYY-MM-DD')

    const logContext = { executionId, executionStartedAt, date }
    const log = Logger.child(logContext)

    log.info({}, 'starting-operating-debts-process')

    const operatingDebtService = new OperatingDebtService(log)

    await operatingDebtService.processNegativeSettlements(date)

    log.info({}, 'operating-debts-processed-successfully')
  }
}
