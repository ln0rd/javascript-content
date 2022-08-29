import moment from 'moment'

import createLogger from 'framework/core/adapters/logger'
import { isBusinessDay } from 'application/core/helpers/date'

import SubacquirerSetPayablesPaid from 'application/queue/tasks/manual/subacquirer-set-payables-paid'
import SubacquirerSetPayablesPaidFarmapay from 'application/queue/tasks/manual/subacquirer-set-payables-paid-farmapay'
import SubacquirerLiquidateSettlements from 'application/queue/tasks/manual/subacquirer-liquidate-settlements'
import SubacquirerExecuteCharges from 'application/queue/tasks/manual/subacquirer-execute-charges'
import ProcessSettlementsDebts from 'application/queue/tasks/manual/process-settlements-debts'
import ManualPayOperatingDebts from 'application/queue/tasks/manual/manual-pay-operating-debts'

const Logger = createLogger({ name: 'MANUAL_PROCESS_SETTLEMENTS' })

/**
 * Processes the Settlement for the day, by sequentially running
 * other manual tasks. Since one task depends on the other, we
 * fail fast and stop everything in case of any failure.
 *
 * This task will be called by PeriodicProcessSettlements at
 * 6:30 am GMT-3 every weekday. The processes themselves
 * will only run if this is a business day, as defined in the
 * business day library.
 */
export default class ManualProcessSettlements {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const todayIsBusinessDay = await isBusinessDay(moment())

    if (!todayIsBusinessDay) {
      Logger.error('skipping-settlement-for-non-business-day')

      return
    }

    Logger.info('starting-processing-settlements')

    await SubacquirerSetPayablesPaidFarmapay.handler([]).catch(
      Logger.error('error-processing-settlement-step-farmapay')
    )

    await SubacquirerSetPayablesPaid.handler([]).catch(
      logAndRethrow('SetPayablesPaid')
    )

    await SubacquirerExecuteCharges.handler().catch(
      logAndRethrow('ExecuteCharges')
    )

    await ProcessSettlementsDebts.handler().catch(
      logAndRethrow('ProcessSettlementsDebts')
    )

    await ManualPayOperatingDebts.handler().catch(
      logAndRethrow('ManualPayOperatingDebts')
    )

    await SubacquirerLiquidateSettlements.handler(args).catch(
      logAndRethrow('LiquidateSettlements')
    )

    Logger.info('ended-processing-settlements')
  }
}

function logAndRethrow(step) {
  function throwError(err) {
    Logger.error({ err, step }, 'error-processing-settlement-step')

    throw err
  }

  return throwError
}
