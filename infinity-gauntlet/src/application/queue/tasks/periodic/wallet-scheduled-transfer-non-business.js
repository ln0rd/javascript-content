import WalletScheduledTransfer from 'application/queue/tasks/manual/wallet-scheduled-transfer'
import { isBusinessDay } from 'application/core/helpers/date'
import createLogger from 'framework/core/adapters/logger'
import moment from 'moment'

const Logger = createLogger({
  name: 'SCHEDULED_WALLET_TRANSFERS_NON_BUSINESS_DAYS'
})

export default class ExecuteScheduledWalletTransfersNonBusinessDays {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '30 9 * * *'
  }

  static handler() {
    return Promise.resolve()
      .then(checkBusinessDay)
      .then(executeTransfers)

    function checkBusinessDay() {
      return isBusinessDay(moment())
    }

    function executeTransfers(businessDay) {
      if (!businessDay) {
        Logger.info('Executing scheduled wallet transfers on non-business day')
        return WalletScheduledTransfer.handler()
      } else {
        return undefined
      }
    }
  }
}
