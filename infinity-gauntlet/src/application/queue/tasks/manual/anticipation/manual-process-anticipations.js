import moment from 'moment'
import allSettled from 'p-settle'

import createLogger from 'framework/core/adapters/logger'
import Anticipation, {
  CONFIRMED,
  FAILED,
  errorReasons
} from 'application/core/models/anticipation'
import getUniqueId from 'application/core/helpers/unique-id'
import AnticipationService from 'application/core/services/anticipation'
import { CipAnticipationService } from 'modules/cip-integration/cip-anticipation-service'
import { CIPAnticipationRequestStatus } from 'modules/cip-integration/anticipation-request-status'
import { publishMessage } from 'framework/core/adapters/queue'
import { sendAnticipationWebhook } from 'application/core/services/anticipation'

const Logger = createLogger({ name: 'PROCESS_ANTICIPATIONS' })

/**
 * The processing of an anticipation happens right after the operation
 * using the receivables has been requested to our receivables registry entity (CIP)
 * with the help of [CIP Integration](https://github.com/hashlab/cip-integration).
 * The authorization process happens in the PeriodicRequestAnticipationAuthorization worker.
 *
 * After dispatching the request to CIP, we have to process the latest anticipation requests where, for each we:
 *  - Check status at CIP Integration (GET /anticipations/:cipCorrelationId/)
 *   - Match status:
 *      - Pending: Skip.
 *      - Declined:
 *        - Update DB with `status: failed`
 *          - End.
 *      - Authorized:
 *        - Trigger existent AnticipationService.process
 *          - If error:
 *              - Update DB with `status: failed`
 *                  - Trigger existent `RevertSpotAnticipation` workflow
 */
export default class ManualProcessAnticipation {
  static type() {
    return 'manual'
  }

  static async handler({ batchSize } = { batchSize: 10 }) {
    const executionID = getUniqueId()
    const executionStartedAt = moment()
      .tz('America/Sao_Paulo')
      .format()
    const logContext = { executionID, executionStartedAt }
    const Log = Logger.child(logContext)

    Log.info('starting-anticipation-processing')

    // Anticipations should only enter this worker
    // after passing through CIP Integration
    const anticipationsToProcess = await Anticipation.find({
      status: CONFIRMED,
      cip_operation_registered: true
    })
      .limit(batchSize)
      .sort({ created_at: 1 })

    const anticipations = anticipationsToProcess.map(a => a._id)
    Log.info({ anticipations }, 'selected-for-processing')

    const operationPromises = anticipationsToProcess.map(anticipation =>
      processAnticipation(anticipation, logContext)
    )

    const results = await allSettled(operationPromises)
    const failures = results.filter(operation => operation.isRejected)
    const reasons = failures.map(({ reason }) => reason.stack)
    Log.info(
      {
        failed: failures.length,
        failure_reasons: JSON.stringify(reasons),
        total: results.length
      },
      'finished-batch-process-anticipation'
    )
  }
}

export async function processAnticipation(anticipation, logContext) {
  const Log = Logger.child(logContext)

  const cipCorrelationId = anticipation.cip_correlation_id
  const anticipationId = anticipation._id
  const cipAnticipationService = new CipAnticipationService({ logContext })

  const [status, err] = await cipAnticipationService.checkStatus({
    cipCorrelationId
  })

  if (err) {
    Log.error({ cipCorrelationId, err }, 'failed-to-check-anticipation-status')

    throw err
  }

  Log.info({ status }, 'anticipation-status-received')

  if (status === CIPAnticipationRequestStatus.AUTHORIZED) {
    Log.info({ cipCorrelationId }, 'anticipation-authorized')

    try {
      await AnticipationService.processAnticipation(anticipationId)
    } catch (err) {
      Log.error(
        { cipCorrelationId, anticipationId, err },
        'failed-to-anticipate'
      )

      throw err
    }

    await triggerNotifications(anticipationId)
  }

  if (status === CIPAnticipationRequestStatus.DECLINED) {
    Log.info({ cipCorrelationId }, 'anticipation-declined')

    const oldStatus = anticipation.status
    anticipation.status = FAILED
    anticipation.status_history.push(FAILED)
    anticipation.error_reason = errorReasons.declinedByCIP

    try {
      await anticipation.save()
    } catch (err) {
      Log.error({ cipCorrelationId }, 'failed-updating-declined-anticipation')

      throw err
    }

    await triggerNotifications(anticipationId)
    await sendAnticipationWebhook(anticipation, {
      eventName: 'anticipation_failed',
      oldStatus
    })
  }

  Log.info({ cipCorrelationId }, 'skipping-pending-anticipation')

  return
}

async function triggerNotifications(anticipationId) {
  return publishMessage(
    'NotifyAnticipationStatus',
    Buffer.from(
      JSON.stringify({
        anticipationId
      })
    )
  )
}
