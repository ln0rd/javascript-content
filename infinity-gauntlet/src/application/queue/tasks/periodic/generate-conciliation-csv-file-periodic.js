import moment from 'moment'
import GenerateConciliationCSVFile from 'application/queue/tasks/manual/generate-conciliation-csv-file'

export default class GenerateConciliationCSVFilePeriodic {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '30 5 * * *'
  }

  static handler() {
    const yesterday = moment()
      .subtract(1, 'days')
      .format('YYYY-MM-DD')

    return GenerateConciliationCSVFile.handler([
      yesterday,
      ['sales', 'settlements'],
      true
    ])
  }
}
