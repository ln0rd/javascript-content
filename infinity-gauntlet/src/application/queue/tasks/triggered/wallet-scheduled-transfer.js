import Promise from 'bluebird'
import moment from 'moment'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import WalletTransferHistory, {
  SCHEDULED,
  SUCCESSFUL
} from 'application/core/models/wallet-transfer-history'
import WalletService from 'application/core/services/wallet'
import { createWalletClient } from '@hashlab/wallet-client'
import config from 'application/core/config'

const Logger = createLogger({ name: 'WALLET_SCHEDULED_TRANSFER' })

export default class WalletScheduledTransfer {
  static type() {
    return 'triggered'
  }

  static handler() {
    Logger.info('Starting wallet scheduled transfers task...')
    let transfersCount = 0

    return Promise.resolve()
      .then(getTransfers)
      .then(executeTransfers)
      .then(messageLog)
      .catch(errorHandler)

    function getTransfers() {
      let start = moment()
        .startOf('day')
        .toISOString()
      let end = moment()
        .endOf('day')
        .toISOString()

      return WalletTransferHistory.find({
        scheduled_to: { $gte: start, $lt: end },
        status: SCHEDULED
      })
        .lean()
        .exec()
    }

    function executeTransfers(transfersToExecute) {
      transfersCount = transfersToExecute.length

      Logger.info(
        `Found ${transfersCount} scheduled wallet transfers to execute`
      )
      return Promise.resolve()
        .then(instantiateWallet)
        .then(execute)

      function instantiateWallet() {
        return createWalletClient(config.services.wallet_endpoint)
      }

      function execute(walletClient) {
        return Promise.all(
          transfersToExecute
            .map(transfer => {
              return Promise.resolve()
                .then(executeScheduledTransfer)
                .spread(updateTransaction)

              function executeScheduledTransfer() {
                return WalletService.executeWalletTransferOperations(
                  frameworkConfig.core.i18n.defaultLocale,
                  transfer,
                  Logger,
                  walletClient
                )
              }

              function updateTransaction(updatedTransfer, lastOperation) {
                updatedTransfer.success_at.push(lastOperation)
                updatedTransfer.status = SUCCESSFUL

                return WalletTransferHistory.findOneAndUpdate(
                  { _id: updatedTransfer._id },
                  updatedTransfer,
                  { new: true }
                )
                  .lean()
                  .exec()
              }
            })
            //this ensures that if any scheduled transfer fails, the task will still continue to try to transfer the remaining ones
            .map(p =>
              p.catch(() => {
                transfersCount -= 1
                return undefined
              })
            )
        )
      }
    }

    function messageLog() {
      Logger.info(
        `Successfully executed ${transfersCount} scheduled wallet transfers!`
      )
    }

    function errorHandler(err) {
      Logger.error({
        err,
        operation: 'wallet_scheduled_wallet_transfers',
        reason: 'GENERIC_ERROR'
      })
    }
  }
}
