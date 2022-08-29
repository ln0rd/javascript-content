import { createWalletClient } from '@hashlab/wallet-client'
import config from 'application/core/config'
import axios from 'axios'
import createLogger from 'framework/core/adapters/logger'
import parseCSV from 'neat-csv'
import ManualTaskHistory, {
  FAILED,
  SUCCESSFUL
} from 'application/core/models/manual-task-history'
import AccountService from 'application/core/services/account'

const taskName = 'MANUAL_COMPENSATORY_PUT_MONEY'
const Logger = createLogger({ name: taskName })
const walletClient = createWalletClient(config.services.wallet_endpoint)

const reasons = [
  'NC_BUG_ADJUSTMENT',
  'MDR_FEE_ADJUSTMENT',
  'ANTICIPATION_FEE_ADJUSTMENT',
  'DEBT_TRANSFER',
  'ANTICIPATION',
  'PIX_REFUND',
  'TED_REFUND',
  'SETTLEMENT_REFUND',
  'CHARGE_REFUND',
  'CHARGEBACK_REFUND',
  'WALLET_TRANSFER',
  'POS_ACQUISITION_TOTAL_REFUND',
  'POS_ACQUISITION_PARTIAL_REFUND'
]

const originTypes = [
  'transaction',
  'payable',
  'settlement',
  'payout',
  'ted',
  'pix',
  'charge',
  'case',
  'other'
]

let successPutMoneys = []
let failedPutMoneys = []

export default class ManualCompensatoryPutMoney {
  static type() {
    return 'manual'
  }

  static async handler(args) {
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
    for (const [index, row] of inputs.entries()) {
      await executePutMoney(row, index + 1)
    }
    /* eslint-enable no-await-in-loop */

    Logger.info(
      { successPutMoneys, failedPutMoneys, url },
      'manual-compensatory-put-money-finished'
    )
  }
}

async function executePutMoney(
  {
    company_id: companyId,
    wallet_id: walletId,
    amount,
    reason,
    origin_type: originType,
    origin_id: originId
  },
  lineNumber
) {
  const hasMandatoryFields =
    companyId && walletId && amount && reason && originType && originId

  if (!hasMandatoryFields) {
    Logger.error({ lineNumber }, 'line-missing-field')

    failedPutMoneys.push(lineNumber)
    return
  }

  if (!reasons.includes(reason)) {
    Logger.error({ reason, lineNumber }, 'reason-not-found')

    failedPutMoneys.push(lineNumber)
    return
  }

  if (!originTypes.includes(originType)) {
    Logger.error({ originType, lineNumber }, 'origin-type-not-found')

    failedPutMoneys.push(lineNumber)
    return
  }

  const requestId = `source(MANUAL_COMPENSATORY_PUT_MONEY):reason(${reason}):${originType}(${originId})`

  const manualTask = await ManualTaskHistory.findOne({
    task: taskName,
    status: SUCCESSFUL,
    args: `${requestId}:${walletId}:${amount}`
  }).select('_id')

  if (manualTask) {
    Logger.error({ lineNumber }, 'put-money-already-exists')

    failedPutMoneys.push(lineNumber)
    return
  }

  const account = await AccountService.getAccountByCompanyId(companyId)
  if (!account) {
    Logger.error({ companyId, lineNumber }, 'account-not-found')

    failedPutMoneys.push(lineNumber)
    return
  }

  if (account.balance_id !== walletId) {
    Logger.error(
      { walletId, account: account, lineNumber },
      'invalid-wallet-id'
    )

    failedPutMoneys.push(lineNumber)
    return
  }

  try {
    await walletClient.putMoneyIntoWallet(walletId, {
      amount: amount,
      requestId
    })

    await ManualTaskHistory.create({
      task: taskName,
      status: SUCCESSFUL,
      args: `${requestId}:${walletId}:${amount}`
    })

    Logger.info({ walletId, amount, lineNumber }, 'compensatory-put-money-done')
    successPutMoneys.push(lineNumber)
  } catch (err) {
    Logger.error({ err, walletId, amount, lineNumber }, 'wallet-request-failed')

    failedPutMoneys.push(lineNumber)

    await ManualTaskHistory.create({
      task: taskName,
      status: FAILED,
      args: `${requestId}:${walletId}:${amount}`
    })
  }
}
