import Promise from 'bluebird'
import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import moment from 'moment'
import Payable from 'application/core/models/payable'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MANUAL_PARCIAL_REFUND' })

async function fetchPayablesFromCsv(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasPayables = inputs.every(row => 'payableId' in row)
  assert(hasPayables, 'Malformed input CSV. It must have "payableId" fields.')
  return inputs.map(({ payableId }) => payableId)
}

export default class RefundTransactionPartially {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'set-payables-as-paid')

    return Promise.resolve(args)
      .tap(logStart)
      .then(setPayablesAsPaid)

    function logStart() {
      Logger.info('Start setting payables as paid!')
    }

    async function setPayablesAsPaid(args) {
      const payablesIds = await fetchPayablesFromCsv(args[0])

      Logger.info(`Processing ${payablesIds.length} payables!`)

      try {
        const updateWriteOpResult = await Payable.updateMany(
          { _id: { $in: payablesIds } },
          {
            $set: {
              status: 'paid',
              updated_at: moment().toDate()
            }
          }
        )
        Logger.info(
          {
            result: updateWriteOpResult,
            total_payables: payablesIds
          },
          'Payables-updated-successfully'
        )
      } catch (err) {
        Logger.error(
          {
            err,
            total_payables: payablesIds.length
          },
          'error-updating-payables'
        )
      }
    }
  }
}
