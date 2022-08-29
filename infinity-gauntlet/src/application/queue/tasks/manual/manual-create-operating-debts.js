import createLogger from 'framework/core/adapters/logger'
import axios from 'axios'
import parseCSV from 'neat-csv'
import { operatingDebtsType } from 'application/core/models/operating-debt'
import OperatingDebtService from 'modules/operating-debts/application/services/operating-debt'

const Logger = createLogger({ name: 'MANUAL_CREATE_OPERATING_DEBTS' })

export default class ManualCreateOperatingDebts {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info('manual-create-operating-debts-starting')

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
      await createOperatingDebts(input)
    }

    Logger.info({ url }, 'manual-create-operating-debts-finished')
  }
}

async function createOperatingDebts({
  companyId,
  type,
  debtAmount,
  description
}) {
  const hasMandatoryFields = companyId && type && debtAmount

  if (!hasMandatoryFields) {
    Logger.error({ companyId }, 'missing-field')
    return
  }

  if (!operatingDebtsType.includes(type)) {
    Logger.error({ companyId, type }, 'operation-debt-type-not-found')
    return
  }

  const query = {
    company_id: companyId,
    debt_amount: debtAmount,
    paid_amount: 0,
    model: 'manual',
    type,
    payment_history: []
  }

  if (description !== '') {
    query.description = description
  }

  const operatingDebtService = new OperatingDebtService(Logger)
  try {
    await operatingDebtService.operatingDebtRepository.create(query)
    Logger.info(
      {
        companyId,
        type,
        debtAmount,
        description
      },
      'operating-debt-created-successfully'
    )
  } catch (err) {
    Logger.error({ err, companyId }, 'error-creating-operating-debt')
  }
}
