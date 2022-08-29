/* eslint-disable no-await-in-loop */
import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import moment from 'moment-timezone'
import waitForAllSettled from 'p-settle'
import createLogger from 'framework/core/adapters/logger'
import getUniqueId from 'application/core/helpers/unique-id'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'

const Logger = createLogger({ name: 'MANUAL_DEBT_TRANSFER' })

export default class ManualDebtTransfer {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    const executionId = getUniqueId()
    const executionStartedAt = moment()
      .tz('America/Sao_Paulo')
      .format()
    const logContext = { executionId, executionStartedAt, args }
    const log = Logger.child(logContext)
    const debtIds = await fetchOperatingDebtsFromCsv(args[0])

    const operatingDebtService = new OperatingDebtService(Logger)
    const transfers = debtIds.map(async ({ operatingDebtId, companyId }) => {
      try {
        await operatingDebtService.makeDebtTransfer(operatingDebtId, companyId)
      } catch (err) {
        log.info({ operatingDebtId, companyId }, 'error-making-debt-transfer')
        throw err
      }
    })

    const results = await waitForAllSettled(transfers)
    const failures = results.filter(operation => operation.isRejected)
    if (failures.length > 0) {
      log.info(
        {
          total_transfers: transfers.length,
          failures: failures.length,
          total: results.length
        },
        'finished-transfers-failures'
      )
    }
  }
}

async function fetchOperatingDebtsFromCsv(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasDebtsAndCompanies = inputs.every(
    row => 'operatingDebtId' in row && 'companyId' in row
  )
  assert(
    hasDebtsAndCompanies,
    'Malformed input CSV. It must have "operatingDebtId" and companyId fields.'
  )
  return inputs
}
