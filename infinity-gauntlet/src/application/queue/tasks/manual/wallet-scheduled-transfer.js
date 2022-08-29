import Promise from 'bluebird'
import moment from 'moment'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import WalletTransferHistory, {
  SCHEDULED
} from 'application/core/models/wallet-transfer-history'
import WalletService from 'application/core/services/wallet'
import { createWalletClient } from '@hashlab/wallet-client'
import config from 'application/core/config'
import { publishMessage } from 'framework/core/adapters/queue'

const Logger = createLogger({ name: 'WALLET_SCHEDULED_TRANSFER' })

export default class WalletScheduledTransfer {
  static type() {
    return 'manual'
  }

  static handler() {
    Logger.info('Starting wallet scheduled transfers task...')
    let foundTransfersCount = 0
    let failedTransfersCount = 0

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
      foundTransfersCount = transfersToExecute.length

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
              return executeScheduledTransfer().then(logTransfer)

              function executeScheduledTransfer() {
                return WalletService.executeWalletTransferOperations(
                  frameworkConfig.core.i18n.defaultLocale,
                  transfer,
                  Logger,
                  walletClient
                )
              }

              function logTransfer() {
                Logger.info({
                  amount: transfer.requested_amount,
                  source_company_id: transfer.soruce_company,
                  destination_company_id: transfer.destination_company,
                  scheduled_to: moment(transfer.scheduled_to).format(
                    'YYYY-MM-DD'
                  )
                })
              }
            })
            //this ensures that if any scheduled transfer fails, the task will still continue to try to transfer the remaining ones
            .map((p, index) =>
              p.catch(err => {
                let transfer = transfersToExecute[index]
                failedTransfersCount += 1

                Logger.error({
                  err,
                  operation: 'wallet_scheduled_wallet_transfers',
                  reason: 'TRANSFER_ERROR',
                  amount: transfer.requested_amount,
                  source_company_id: transfer.soruce_company,
                  destination_company_id: transfer.destination_company,
                  scheduled_to: moment(transfer.scheduled_to).format(
                    'YYYY-MM-DD'
                  )
                })

                return sendSlackMessage(
                  `
                Scheduled transfer ${transfer._id.toString()} encountered an error while trying to execute`,
                  err
                )
              })
            )
        )
      }
    }

    function messageLog() {
      let message = `Found ${foundTransfersCount} scheduled wallet transfers: ${failedTransfersCount} encountered errors, ${foundTransfersCount -
        failedTransfersCount} were processed`

      Logger.info(message)
    }

    function errorHandler(err) {
      Logger.error({
        err,
        operation: 'wallet_scheduled_wallet_transfers',
        reason: 'GENERIC_ERROR'
      })

      return sendSlackMessage({}, err, true)
    }
  }
}

function sendSlackMessage(message, err, taskError) {
  let text = taskError ? 'Scheduled wallet transfers task failed!' : message
  let outMessage = {
    channel: 'finops',
    text: text
  }

  if (err) {
    outMessage.attachments = [
      {
        text: err.message
      }
    ]
  }

  return publishMessage('Slacker', Buffer.from(JSON.stringify(outMessage)))
}
