import Promise from 'bluebird'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import WalletTransferHistory, {
  operations,
  errorReasons,
  FAILED,
  SUCCESSFUL
} from 'application/core/models/wallet-transfer-history'
import { createWalletClient } from '@hashlab/wallet-client'
import {
  WalletRevertTransferError,
  WalletRevertTransferMaxAttemptsError
} from 'application/core/errors/wallet-transfer-errors'
import { errorSerializer } from 'application/core/helpers/error'
import RevertWalletTransfer from 'application/queue/tasks/triggered/wallet-revert-transfer'

const Logger = createLogger({ name: 'WALLET_REVERT_TRANSFER' })

export default class WalletRevertTransfer {
  static type() {
    return 'triggered'
  }

  static handler(transferId) {
    Logger.info('Starting wallet transfer reversal task...')

    return Promise.resolve()
      .then(getTransfer)
      .tap(checkTransfer)
      .tap(checkNumberOfAttempts)
      .then(revertTransfer)
      .then(messageLog)

    function getTransfer() {
      return WalletTransferHistory.findOne({ _id: transferId })
        .lean()
        .exec()
    }

    function checkTransfer(transferToRevert) {
      if (!transferToRevert) {
        throw new WalletRevertTransferError(
          frameworkConfig.core.i18n.defaultLocale,
          transferId
        )
      }
    }

    function checkNumberOfAttempts(transferToRevert) {
      if (transferToRevert.revert_attempts > config.wallet.revert.attempts) {
        throw new WalletRevertTransferMaxAttemptsError(
          frameworkConfig.core.i18n.defaultLocale,
          transferId
        )
      }
    }

    function revertTransfer(transferToRevert) {
      transferToRevert.revert_attempts = transferToRevert.revert_attempts || 0
      transferToRevert.revert_attempts += 1
      transferToRevert.tried_to_revert = true

      const timeout =
        config.wallet.revert.timeout_base ** transferToRevert.revert_attempts

      Logger.info(`Waiting ${timeout / 1000} seconds before continuing...`)

      return Promise.resolve()
        .delay(timeout)
        .then(instantiateWallet)
        .then(revertFlow)

      function instantiateWallet() {
        return createWalletClient(config.services.wallet_endpoint)
      }

      function revertFlow(walletClient) {
        let operation
        switch (transferToRevert.error_at[
          transferToRevert.error_at.length - 1
        ]) {
          case operations.schedule:
          case operations.cancel:
          case operations.noRevertActionRequired:
          case operations.instantiateWallet:
          case operations.freezeAmount:
            return Promise.resolve()
              .then(finishRevert)
              .catch(errorHandler)

          case operations.putMoney:
          case operations.unfreezeAmount:
            return Promise.resolve()
              .then(unfreezeAmount)
              .then(finishRevert)
              .catch(errorHandler)

          case operations.takeMoney:
          case operations.takeMoneyBack:
            return Promise.resolve()
              .then(takeMoneyBack)
              .then(unfreezeAmount)
              .then(finishRevert)
              .catch(errorHandler)

          case operations.finishTransfer:
            transferToRevert.status = SUCCESSFUL
            return WalletTransferHistory.create(transferToRevert)

          default:
            throw new WalletRevertTransferError(
              frameworkConfig.core.i18n.defaultLocale,
              transferId
            )
        }

        function unfreezeAmount() {
          if (operation) {
            transferToRevert.success_at.push(operation)
            Logger.info(
              `Finished ${operation} on transfer ${transferToRevert._id}`
            )
          }
          operation = operations.unfreezeAmount
          Logger.info(
            `Reverting freezeAmount of transfer ${transferToRevert._id}`
          )

          return walletClient.unfreezeWalletAmount(
            transferToRevert.source_wallet_id,
            {
              frozenAmountId: transferToRevert.freeze_id,
              takeAmountAtomically: false,
              requestId: transferToRevert.request_id
            }
          )
        }

        function takeMoneyBack() {
          operation = operations.takeMoneyBack
          Logger.info(`Reverting putMoney of transfer ${transferToRevert._id}`)

          return walletClient.takeMoneyFromWallet(
            transferToRevert.destination_wallet_id,
            {
              amount: transferToRevert.requested_amount,
              requestId: transferToRevert.request_id
            }
          )
        }

        function finishRevert() {
          Logger.info(
            `Finished ${operation ||
              operations.noRevertActionRequired} on transfer ${
              transferToRevert._id
            }`
          )

          transferToRevert.reverted = true
          transferToRevert.success_at.push(
            operation || operations.noRevertActionRequired
          )

          return WalletTransferHistory.findOneAndUpdate(
            { _id: transferToRevert._id },
            transferToRevert,
            { new: true }
          )
        }

        function errorHandler(err) {
          transferToRevert.status = FAILED
          transferToRevert.error_at.push(operation)
          transferToRevert.captured_errors.push(errorSerializer(err))
          Logger.error({
            err,
            operation: `wallet_revert_transfer_task:${operation}:${
              transferToRevert.request_id
            }`
          })

          /* eslint-disable promise/no-promise-in-callback */
          return Promise.resolve()
            .then(saveHistory)
            .then(triggerRevertTransfer)

          function saveHistory() {
            return WalletTransferHistory.findOneAndUpdate(
              { _id: transferToRevert._id },
              transferToRevert,
              { new: true }
            )
          }

          function triggerRevertTransfer(transferToRevertAgain) {
            RevertWalletTransfer.handler(
              transferToRevertAgain._id.toString(),
              errorReasons.transactionError
            )

            return null
          }
        }
      }
    }

    function messageLog(transferToRevert) {
      if (transferToRevert) {
        Logger.info(`Successfully reverted transfer ${transferToRevert._id}!`)
      }
    }
  }
}
