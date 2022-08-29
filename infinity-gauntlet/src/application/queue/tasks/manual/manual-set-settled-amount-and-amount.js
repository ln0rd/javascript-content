import getUniqueId from 'application/core/helpers/unique-id'
import createLogger from 'framework/core/adapters/logger'
import axios from 'axios'
import parseCSV from 'neat-csv'
import assert from 'assert'
import waitForAllSettled from 'p-settle'
import Settlement from 'application/core/models/settlement'
import moment from 'moment'

const Logger = createLogger({ name: 'MANUAL_SET_SETTLED_AMOUNT_AND_AMOUNT' })

export default class ManualSetSettledAmountAndAmount {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const executionId = getUniqueId()

    const settlemendIds = await fetchSettlementsIds(args[0])

    Logger.info({ settlemendIds }, `settlements-ids`)
    const updatingSettlements = settlemendIds.map(async settlementId => {
      Logger.info(`working-settlement-${settlementId}`)
      try {
        await settleAmountValueInSettlements(executionId, settlementId)
      } catch (err) {
        Logger.error(
          { executionId },
          'error-to-fetch-settlements-from-csv-and-update'
        )
        throw err
      }
    })

    const results = await waitForAllSettled(updatingSettlements)
    const failures = results.filter(operation => operation.isRejected)
    if (failures.length > 0) {
      Logger.error(
        {
          total_transfers: updatingSettlements.length,
          failures: failures.length,
          total: results.length
        },
        'finished-transfers-failures'
      )
    }
  }
}

async function fetchSettlementsIds(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasSettlementId = inputs.every(row => 'settlementId' in row)
  assert(
    hasSettlementId,
    'Malformed input CSV. It must have "settlementId" fields.'
  )
  return inputs.map(({ settlementId }) => settlementId)
}

async function settleAmountValueInSettlements(executionId, settlementId) {
  Logger.info({ settlementId }, `searching-settlement-id-${settlementId}`)
  let settlementFound
  try {
    settlementFound = await Settlement.findOne({ _id: settlementId })
  } catch (err) {
    Logger.error({ err }, 'error-to-found-settlement-by-id')
    throw err
  }

  Logger.info({ settlementFound }, 'settlement-found')

  if (!settlementFound) {
    Logger.error('error-settlement-not-found')
    return
  }

  try {
    const updateData = {
      settled_amount: settlementFound.amount,
      updated_at: moment().toDate(),
      status: 'settled'
    }
    await Settlement.updateOne({ _id: settlementId }, updateData)
  } catch (err) {
    Logger.error({ err }, 'error-to-update-settlement-amount-by-id')
    throw err
  }

  Logger.info(
    { executionId, settlementId },
    'settled-amount-updated-sucessefully'
  )
}
