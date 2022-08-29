/* eslint-disable no-await-in-loop */
import moment from 'moment-timezone'
import createLogger from 'framework/core/adapters/logger'
import Settlement from 'application/core/models/settlement'
import getUniqueId from 'application/core/helpers/unique-id'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'

const Logger = createLogger({ name: 'MANUAL_PAY_OPERATING_DEBTS' })

const BATCH_LIMIT = 200

export default class ManualPayOperatingDebts {
  static type() {
    return 'manual'
  }

  static async handler() {
    const executionId = getUniqueId()
    const executionStartedAt = moment()
      .tz('America/Sao_Paulo')
      .format()
    const date = moment().format('YYYY-MM-DD')
    const logContext = { executionId, executionStartedAt, date }
    const log = Logger.child(logContext)
    log.info({}, 'starting-payment-operating-debts')

    const query = {
      date,
      status: 'processing',
      amount: { $gt: 0 }
    }
    const operatingDebtService = new OperatingDebtService(log)
    let skip = 0
    let runAgain = true
    while (runAgain) {
      try {
        runAgain = await payDebtsInBatch(
          operatingDebtService,
          BATCH_LIMIT,
          skip,
          query
        )
        skip = BATCH_LIMIT + skip
      } catch (err) {
        Logger.error(
          { err, BATCH_LIMIT, skip, query },
          'error-send-webhook-in-batch'
        )
        break
      }
    }
    log.info({}, 'payment-operating-debts-finished')
  }
}

/**
 * Efetua o pagamento da divida da company em lote
 * @param {OperatingDebtService} operatingDebtService
 * @param {Number} limit
 * @param {Number} skip
 * @param {Object} query
 * @returns {Promise<boolean>}
 */
async function payDebtsInBatch(operatingDebtService, limit, skip, query) {
  const settlements = await Settlement.find(query)
    .limit(limit)
    .skip(skip)
    .sort({ created_at: 1 })
    .lean()
  if (settlements.length <= 0) {
    return false
  }
  for (const settlement of settlements) {
    try {
      await operatingDebtService.payOperatingDebtWithSettlement(settlement)
    } catch (err) {
      throw err
    }
  }
  return true
}
