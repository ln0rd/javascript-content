import moment from 'moment'
import { createLogger } from '@hashlab/logger'
import { generateConciliationCSVFile } from 'conciliation'

const Logger = createLogger({ name: 'GENERATE_CONCILIATION_CSV_FILE' })

/**
 * Task used to generate conciliation csv file And send conciliation file by email
 * passing date, type of conciliation(sales ou settlements)
 * TASK_PARAMS example: '2020-12-31\,settlements'
 */
export default class GenerateConciliationCSVFile {
  static type() {
    return 'manual'
  }

  /**
   * args 0 - date - conciliation date
   * args 1 - types - type of conciliation (sales ou settlements)  if not passed, the two types will pass on
   * @param {Array} args - TASK_PARAMS example: '2020-12-31\,settlements\,true'
   */
  static async handler(args) {
    const { date, types } = parseTaskParams(args)

    try {
      await generateConciliationCSVFile(date, types)
    } catch (err) {
      Logger.error({ err }, 'build-csv-conciliation-error')
    }
  }
}

/**
 * @param args
 * @return {{date: string, types: string[]}}
 */
function parseTaskParams(args) {
  let [date, type] = args

  date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)
    ? date
    : moment().format('YYYY-MM-DD')

  const types = type ? [].concat(type) : ['sales', 'settlements']

  return { date, types }
}
