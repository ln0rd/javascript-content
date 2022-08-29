import createLogger from 'framework/core/adapters/logger'
import axios from 'axios'
import parseCSV from 'neat-csv'
import {
  STATUS_CANCELED,
  STATUS_PENDING
} from 'application/core/models/operating-debt'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'
import moment from 'moment'

const Logger = createLogger({ name: 'MANUAL_CANCEL_OPERATING_DEBTS' })

export default class ManualCancelOperatingDebts {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info('manual-cancel-operating-debts-starting')

    if (args.length !== 1) {
      throw new Error(
        'Invalid arguments. args[0] must be a URL pointing to a CSV file.'
      )
    }

    const url = args[0]

    Logger.info({ url }, 'downloading-csv')

    let response
    try {
      response = await axios({ url, method: 'GET', timeout: 5000 })
    } catch (err) {
      Logger.error({ err }, 'failed-to-download-csv')
      return
    }

    Logger.info({ url }, 'download-done')

    const inputs = await parseCSV(response.data)
    /* eslint-disable no-await-in-loop */
    for (const input of inputs) {
      await cancelOperatingDebts(input)
    }

    Logger.info({ url }, 'manual-cancel-operating-debts-finished')
  }
}

async function cancelOperatingDebts({ operatingDebtId, cancelReason }) {
  const hasMandatoryFields = operatingDebtId && cancelReason

  if (!hasMandatoryFields) {
    Logger.error({ operatingDebtId }, 'missing-field')
    return
  }

  const operatingDebtService = new OperatingDebtService(Logger)

  const debtExists = await operatingDebtService.operatingDebtRepository.findOne(
    {
      _id: operatingDebtId
    }
  )
  if (!debtExists) {
    Logger.error({ operatingDebtId }, 'operating-debt-not-found')
    return
  }

  if (debtExists.status !== STATUS_PENDING) {
    Logger.error(
      { operatingDebtStatus: debtExists.status },
      'operating-debt-status-cant-be-paid-or-canceled'
    )
    return
  }

  try {
    const updateWriteOpResult = await operatingDebtService.operatingDebtRepository.updateOne(
      { _id: operatingDebtId },
      {
        $set: {
          status: STATUS_CANCELED,
          cancel_reason: cancelReason,
          updated_at: moment().toDate()
        }
      }
    )
    Logger.info(
      { result: updateWriteOpResult, operatingDebtId },
      'operating-debt-canceled-successfully'
    )
  } catch (err) {
    Logger.error({ operatingDebtId }, 'error-updating-operating-debt')
  }
}
