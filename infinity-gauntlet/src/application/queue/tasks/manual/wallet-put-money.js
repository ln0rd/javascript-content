import createLogger from 'framework/core/adapters/logger'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'
import config from 'application/core/config'
import { createWalletClient } from '@hashlab/wallet-client'
import cuid from 'cuid'
import { createId } from 'application/core/domain/breadcrumbs'

const taskName = 'PUT_MONEY_IN_WALLET_TASK'
const Logger = createLogger({ name: taskName })

export default class PutMoneyInWallet {
  static type() {
    return 'manual'
  }

  static handler(paramArray) {
    const params = parseParams(paramArray)
    const args = JSON.stringify(params)

    const client = createWalletClient(config.services.wallet_endpoint)

    return client
      .putMoneyIntoWallet(params.walletId, {
        amount: params.amount,
        requestId: params.uid
      })
      .then(() => {
        Logger.info({ args }, 'putMoneyIntoWalletTaskSuccess')

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
        Logger.error({ err, args }, 'putMoneyIntoWalletTaskError')
        return ManualTaskHistory.create({
          task: taskName,
          status: FAILED,
          args
        })
      })

    function parseParams(paramList) {
      return {
        walletId: paramList[0],
        amount: parseInt(paramList[1], 10),
        uid: paramList[2] || createId({ uid: cuid(), source: taskName })
      }
    }
  }
}
