import moment from 'moment-timezone'
import frameworkConfig from 'framework/core/config'
import { isBusinessDay } from 'application/core/helpers/date'
import { PayoutInvalidBusinessDateError } from 'application/core/errors/payout-invalid-date-error'
import SubacquirerAutomaticPayoutsAsync from 'application/queue/tasks/manual/subacquirer-automatic-payouts-async'
import WalletScheduledTransfer from 'application/queue/tasks/manual/wallet-scheduled-transfer'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MANUAL_EXECUTE_PAYOUTS_TASK' })
const locale = frameworkConfig.core.i18n.defaultLocale

export default class ManualExecutePayouts {
  static type() {
    return 'manual'
  }

  static handler() {
    return Promise.resolve()
      .then(checkPayoutDate)
      .then(() => WalletScheduledTransfer.handler())
      .then(() => logStep('ScheduledWalletTransfers'))
      .then(() => SubacquirerAutomaticPayoutsAsync.handler([]))
      .then(() => logStep('SubacquirerAutomaticPayouts'))
      .catch(manualExecutePayoutError)
  }
}

function logStep(step) {
  Logger.info({ step }, 'manualExecutePayouts')

  return Promise.resolve()
}

function checkPayoutDate() {
  return isBusinessDay(moment()).then(isBusinessDay => {
    if (!isBusinessDay) {
      throw new PayoutInvalidBusinessDateError(locale)
    }
    return Promise.resolve()
  })
}

function manualExecutePayoutError(err) {
  return Logger.error({
    MANUAL_EXECUTE_PAYOUTS_TASK_ERROR: {
      error_class: err.name,
      message: err.message
    }
  })
}
