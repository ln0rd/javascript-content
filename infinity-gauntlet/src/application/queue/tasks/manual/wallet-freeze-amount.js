import createLogger from 'framework/core/adapters/logger'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'
import config from 'application/core/config'
import { createWalletClient } from '@hashlab/wallet-client'

const taskName = 'FREEZE_AMOUNT_FROM_WALLET_TASK'
const Logger = createLogger({ name: taskName })

export default class FreezeAmountFromWallet {
  static type() {
    return 'manual'
  }

  static handler(paramArray) {
    const params = parseParams(paramArray)
    const args = JSON.stringify(params)

    const client = createWalletClient(config.services.wallet_endpoint)

    return client
      .freezeWalletAmount(params.walletId, {
        amount: params.amount,
        reason: 'freeze_amount_manual_task'
      })
      .then(freezeAmountResponse => {
        Logger.info(
          { args, freezeAmountResponse },
          'freezeAmountFromWalletTaskSuccess'
        )

        //eslint-disable-next-line
        return ManualTaskHistory.create({
          task: taskName,
          status: SUCCESSFUL,
          args
        }).catch(err => {
          Logger.error({ err, args }, 'ManualTaskHistoryError')
        })
      })
      .catch(err => {
        Logger.error({ err, args }, 'freezeAmountFromWalletTaskError')
        return ManualTaskHistory.create({
          task: taskName,
          status: FAILED,
          args
        })
      })

    function parseParams(paramList) {
      return {
        walletId: paramList[0],
        amount: parseInt(paramList[1], 10)
      }
    }
  }
}
