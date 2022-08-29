import R from 'ramda'
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
    const companiesChunks = R.splitEvery(10, companiesIds)

    Logger.info(
      `Number of possible companies with payables ${companiesIds.length}`
    )

    let total = 0
    let companiesCount = 0
    for (const companyChunk of companiesChunks) {
      const operations = []
      companyChunk.forEach(company => {
        operations.push(
          payablesCollection.updateMany(
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
        )
      })

      // eslint-disable-next-line no-await-in-loop
      const results = await Promise.all(operations)
      const modifiedCount = results.reduce(
        (old, result) => old + result.modifiedCount,
        0
      )
      total += modifiedCount
      companiesCount += companyChunk.length
      Logger.info(`Payables migrated: ${modifiedCount}`)
      Logger.info(`Companies left: ${companiesCount}`)
    }

    Logger.info(`Total of Payables migrated: ${total}`)
  }

  static async getCompaniesWithPayablesFile() {
    const { data } = await axios.get(
      'https://gist.githubusercontent.com/paulovitin/f7f6e722dd2a57c43569dcb1f9b91182/raw/00f9a2e56a4c4322928c78579b7b9c6f30903836/blabla.json',
      {
        header: {
          'Content-Type': 'application/json'
        }
      }
    )

    return data
  }
}
