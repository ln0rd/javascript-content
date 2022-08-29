import Promise from 'bluebird'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import Anticipation, { FAILED } from 'application/core/models/anticipation'
import {
  SpotAnticipationRevertError,
  SpotAnticipationRevertMaxAttemptsError
} from 'application/core/errors/spot-anticipation-errors'
import Payable from 'application/core/models/payable'
import { publishMessage } from 'framework/core/adapters/queue'

const Logger = createLogger({ name: 'SPOT_ANTICIPATION_REVERT' })
const locale = frameworkConfig.core.i18n.defaultLocale

export default class SpotAnticipationRevert {
  static type() {
    return 'triggered'
  }

  static handler(anticipationId) {
    Logger.info('Starting spot anticipation reversal task...', {
      anticipation_id: anticipationId
    })

    return Promise.bind(this)
      .then(getAnticipation)
      .tap(checkAnticipation)
      .tap(checkNumberOfAttempts)
      .then(revertAnticipation)
      .then(messageLog)
      .catch(errorHandler)

    function getAnticipation() {
      return Anticipation.findOne({ _id: anticipationId, status: FAILED })
        .lean()
        .exec()
    }

    function checkAnticipation(anticipationToRevert) {
      if (!anticipationToRevert) {
        throw new SpotAnticipationRevertError(locale)
      }
    }

    function checkNumberOfAttempts(anticipationToRevert) {
      if (
        anticipationToRevert.revert_attempts >
        config.anticipation.spot.revert.attempts
      ) {
        return registerDeadLetter().then(throwError)
      }

      function registerDeadLetter() {
        return sendSlackMessage(
          `Spot anticipation ${
            anticipationToRevert._id
          } failed and could not be reverted (exceeded maximum revert attempts).`,
          { message: 'This is a dead letter registry' },
          anticipationToRevert._id
        )
      }

      function throwError() {
        let err = Object.assign(
          new SpotAnticipationRevertMaxAttemptsError(locale, anticipationId),
          {
            anticipation_id: anticipationToRevert._id,
            company_id: anticipationToRevert.anticipating_company,
            type: 'dead-letter'
          }
        )

        throw err
      }
    }

    function revertAnticipation(anticipationToRevert) {
      const timeout =
        config.anticipation.spot.revert.timeout_base **
        anticipationToRevert.revert_attempts

      Logger.info(`Waiting ${timeout / 1000} seconds before continuing...`)

      return Promise.bind(this)
        .delay(timeout)
        .then(getPayablesToRevert)
        .then(revertPayables)
        .then(updateAnticipation)
        .catch(errorHandler)

      function getPayablesToRevert() {
        return Payable.find({ anticipation: anticipationToRevert._id })
          .lean()
          .exec()
      }

      function revertPayables(payables) {
        return Promise.map(
          payables,
          async payable => {
            const rev = await revertPayable(payable)
            checkPayable(rev)

            return rev
          },
          { concurrency: 1000 }
        )
      }

      function revertPayable(payable) {
        if (payable.data_backup) {
          delete payable.data_backup._id

          return Payable.findOneAndUpdate(
            { _id: payable._id },
            {
              $set: payable.data_backup,
              $unset: {
                anticipation: '',
                data_backup: ''
              }
            },
            { new: true }
          )
            .lean()
            .exec()
        } else {
          return Payable.deleteOne({ _id: payable._id })
            .lean()
            .exec()
        }
      }

      function checkPayable(payable) {
        if (
          !payable ||
          (payable._id && (payable.data_backup || payable.anticipation)) ||
          payable.deletedCount === 0
        ) {
          throw new SpotAnticipationRevertError(locale)
        }
      }

      function updateAnticipation() {
        return Anticipation.findOneAndUpdate(
          {
            _id: anticipationToRevert._id
          },
          {
            $set: {
              reverted: true,
              revert_attempts: anticipationToRevert.revert_attempts + 1
            }
          },
          { new: true }
        )
          .lean()
          .exec()
      }

      function errorHandler(err) {
        /* eslint-disable promise/no-promise-in-callback*/
        return Promise.bind(this)
          .then(updateAnticipation)
          .then(triggerRevertTransfer)

        function triggerRevertTransfer(transferToRevertAgain) {
          Logger.error(err)

          this.handler(transferToRevertAgain._id)

          throw new SpotAnticipationRevertError(locale)
        }
      }
    }

    function messageLog(anticipationToRevert) {
      if (anticipationToRevert) {
        Logger.info(
          `Successfully reverted spot anticipation ${
            anticipationToRevert._id
          }!`,
          {
            anticipation_id: anticipationToRevert._id
          }
        )
      }
    }

    function sendSlackMessage(message, err, anticipationId) {
      let outMessage = {
        channel: 'finops',
        text: message
      }

      if (err) {
        outMessage.attachments = [
          {
            text: err.message,
            color: 'danger'
          }
        ]

        outMessage.blocks = [
          {
            type: 'section',
            text: {
              text: message,
              type: 'mrkdwn'
            },
            fields: [
              {
                type: 'mrkdwn',
                text: '*Priority*'
              },
              {
                type: 'mrkdwn',
                text: '*Anticipation Id*'
              },
              {
                type: 'plain_text',
                text: 'High'
              },
              {
                type: 'plain_text',
                text: anticipationId.toString()
              }
            ]
          }
        ]
      }

      return publishMessage('Slacker', Buffer.from(JSON.stringify(outMessage)))
    }

    function errorHandler(err) {
      Logger.error(err)
    }
  }
}
