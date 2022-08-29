import axios from 'axios'
import moment from 'moment'
import { MongoClient } from 'mongodb'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ADD_ISO_ID_TO_PAYABLES' })

export default class AddIsoIdToPayables {
  static type() {
    return 'manual'
  }

  static getArgs(args) {
    let [start, end] = args
    start = moment(start)
    end = moment(end)

    if (start.isValid() && end.isValid()) {
      return { start: start.toDate(), end: end.toDate() }
    }

    throw new Error('Invalid dates. Format YYYY-MM-DD')
  }

  static async handler(args) {
    const { start, end } = this.getArgs(args)

    Logger.info(
      { start, end },
      `starting-add-iso-id-to-payables-between-${args[0]}-and-${args[1]}`
    )

    const companies = await this.getCompaniesWithPayablesFile()
    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri, {
      useUnifiedTopology: true
    })
    const db = client.db('hashlab')

    const payablesCollection = await db.collection('payables')

    const companiesIds = Object.keys(companies)

    Logger.info(
      `Number of possible companies with payables ${companiesIds.length}`
    )

    let total = 0
    let companiesCount = 0
    for (const company of companiesIds) {
      // eslint-disable-next-line no-await-in-loop
      const result = await payablesCollection.updateMany(
        {
          company_id: company,
          created_at: {
            $gte: start,
            $lt: end
          }
        },
        {
          $set: {
            iso_id: companies[company]
          }
        }
      )

      total += result.modifiedCount
      companiesCount += 1

      Logger.info(`Payables migrated: ${result.modifiedCount}`)
      Logger.info(`Companies left: ${companiesIds.length - companiesCount}`)
    }

    Logger.info(`Total of Payables migrated: ${total}`)
  }

  static async getCompaniesWithPayablesFile() {
    const { data } = await axios.get(
      'https://gist.githubusercontent.com/paulovitin/f059fbfdd8c2976de17023690bef3f2f/raw/959e382b55c891abf6d4d548ba61f1a8f066644f/primary.json',
      {
        header: {
          'Content-Type': 'application/json'
        }
      }
    )

    return data
  }
}
