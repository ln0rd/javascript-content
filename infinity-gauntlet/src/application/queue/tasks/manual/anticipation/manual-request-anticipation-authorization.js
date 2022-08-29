import moment from 'moment'
import allSettled from 'p-settle'
import { Mutex } from 'redis-semaphore'

import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import { redisClient } from 'framework/core/adapters/redis'
import Anticipation, { CONFIRMED } from 'application/core/models/anticipation'
import Company from 'application/core/models/company'

import getUniqueId from 'application/core/helpers/unique-id'
import { getPayablesByAnticipation } from 'application/core/services/anticipation'
import { CipAnticipationService } from 'modules/cip-integration/cip-anticipation-service'
import { buildReceivableUnitsFromAggregation } from 'modules/anticipation/build-receivable-units'
import AccountService from 'application/core/services/account'

const Logger = createLogger({ name: 'REQUEST_ANTICIPATION_AUTHORIZATION' })

const LOCK_TIMEOUT_MS = 30000

/**
 * Requesting an Anticipation Authorization means asking our receivables registry entity (CIP)
 * if these receivables are available for anticipation (i.e. have not been used as guarantee in financial operations)
 * For this, we periodically look for Anticipations that have been inserted in the database and haven't yet been sent to CIP
 * for authorization, using [CIP Integration](https://github.com/hashlab/cip-integration) for that.
 *
 * We will later, in another workflow, check the status of these requests and process the anticipation accordingly.
 */
export default class ManualRequestAnticipationAuthorization {
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

    Log.info('starting-anticipation-authorization-request-flow')

    const anticipationsToProcess = await Anticipation.find({
      status: CONFIRMED,
      cip_operation_registered: false
    })
      .limit(batchSize)
      .sort({ created_at: 1 })

    const anticipations = anticipationsToProcess.map(a => a._id)
    Log.info({ anticipations }, 'selected-for-authorization')

    const operationPromises = anticipationsToProcess.map(anticipation =>
      requestAuthorization(anticipation, logContext)
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
      'finished-batch-requests'
    )
  }
}

export async function requestAuthorization(anticipation, logContext) {
  const anticipationId = anticipation._id
  const cipCorrelationId = anticipation.cip_correlation_id

  const Log = Logger.child(
    Object.assign({}, { anticipationId, cipCorrelationId }, logContext)
  )

  const anticipatedPaymentDate = anticipation.anticipate_to

  const lockKey = `ig:anticipation:authorize:${anticipationId}`
  const mutex = new Mutex(redisClient, lockKey, {
    lockTimeout: LOCK_TIMEOUT_MS
  })

  await mutex.acquire()
  Log.info({ lockKey }, 'acquired-lock')

  try {
    const aggregatedPayables = await getPayablesByAnticipation(
      anticipation
    ).catch(err => {
      Log.error('failed-fetching-payables')

      throw err
    })

    const company_id = anticipation.anticipating_company

    Log.info({ aggregatedPayables }, 'payables-selected')

    const account = await AccountService.getAccountByCompanyId(company_id)
    const locale = frameworkConfig.core.i18n.defaultLocale
    AccountService.checkAccount(locale, account)

    const company = await Company.findOne(
      {
        _id: company_id
      },
      { document_number: 1 }
    )
      .lean()
      .exec()
      .catch(err => {
        Log.error({ companyId: company_id }, 'failed-fetching-company')

        throw err
      })

    const receivableUnits = buildReceivableUnitsFromAggregation(
      aggregatedPayables
    )

    const cipAnticipationService = new CipAnticipationService({ logContext })
    const [response, err] = await cipAnticipationService.authorize({
      cipCorrelationId,
      receivableUnits,
      anticipatedPaymentDate,
      merchantId: company_id,
      walletId: account.balance_id,
      documentNumber: company.document_number
    })

    if (err) {
      Log.error({ err }, 'request-authorization-failure')

      throw err
    }

    Log.info({ response }, 'request-authorization-sucess')

    await Anticipation.findOneAndUpdate(
      {
        _id: anticipationId,
        cip_operation_registered: false,
        cip_correlation_id: cipCorrelationId
      },
      {
        $set: {
          cip_operation_registered: true
        }
      }
    )
  } catch (err) {
    Log.error({ err }, 'error-in-request-authorization')

    throw err
  } finally {
    Log.info({ lockKey }, 'releasing-lock')
    await mutex.release()
  }
}
