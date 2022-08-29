import createLogger from 'framework/core/adapters/logger'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'
import config from 'application/core/config'
import { createWalletClient } from '@hashlab/wallet-client'
import cuid from 'cuid'
import { createId } from 'application/core/domain/breadcrumbs'

const taskName = 'UNFREEZE_AMOUNT_FROM_WALLET_TASK'
const Logger = createLogger({ name: taskName })

export default class UnfreezeAmountFromWallet {
  static type() {
    return 'manual'
  }

  static handler(paramArray) {
    const params = parseParams(paramArray)
    const args = JSON.stringify(params)

    const client = createWalletClient(config.services.wallet_endpoint)

    return client
      .unfreezeWalletAmount(params.walletId, {
        frozenAmountId: params.frozenAmountId,
        takeAmountAtomically: params.takeMoney,
        requestId: params.uid
      })
      .then(() => {
        Logger.info({ args }, 'unfreezeAmountFromWalletTaskSuccess')

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
        Logger.error({ err, args }, 'unfreezeAmountFromWalletTaskError')
        return ManualTaskHistory.create({
          task: taskName,
          status: FAILED,
          args
        })
      })

    function parseParams(paramList) {
      return {
        walletId: paramList[0],
        frozenAmountId: paramList[1],
        takeMoney: paramList[2] === true || paramList[2] === 'true' || false,
        uid: paramList[3] || createId({ uid: cuid(), source: taskName })
      }
    }
  }
}
