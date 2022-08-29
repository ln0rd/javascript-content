import { MongoClient } from 'mongodb'
import randomKey from 'application/core/helpers/random-key'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'
import mongoose from 'mongoose'

const Logger = createLogger({ name: 'ROTATE_COMPANIES_HASH_KEY' })
const DEFAULT_LIMIT = 1000
const DEFAULT_SKIP = 0
const UPDATE_SLEEP_TIME = 100 // milliseconds

export default class RotateCompaniesHashKey {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    let hashKeysUpdatedSuccess = 0
    let hashKeysUpdatedErrors = 0
    let includeCompanyID
    let query = {}

    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri)
    const db = client.db('hashlab')
    const companies = db.collection('companies')

    if (args) {
      includeCompanyID = args[0]
    }

    if (includeCompanyID) {
      query = {
        $or: [
          {
            _id: mongoose.Types.ObjectId(includeCompanyID)
          },
          { parent_id: includeCompanyID }
        ]
      }
    }

    const updateCompaniesHashKey = async (
      limit = DEFAULT_LIMIT,
      skip = DEFAULT_SKIP
    ) => {
      const queryCompanies = await companies
        .find(query)
        .limit(limit)
        .skip(skip)
        .toArray()

      if (queryCompanies.length <= 0) {
        Logger.info('All Companies hash keys were rotated')
        return
      }

      for (let company of queryCompanies) {
        const newHashKey = `hash_${randomKey(30)}`

        Logger.info(`Updated hash_key from company_id: ${company._id}`)
        try {
          // eslint-disable-next-line no-await-in-loop
          await companies.updateOne(
            { _id: company._id },
            { $set: { hash_key: newHashKey } }
          )
          hashKeysUpdatedSuccess += 1
        } catch (err) {
          Logger.error(
            `Error when update hash_key from company_id: ${
              company._id
            }, error=${err}`
          )
          hashKeysUpdatedErrors += 1
        }

        // eslint-disable-next-line promise/avoid-new,no-await-in-loop
        await new Promise(resolve => setTimeout(resolve, UPDATE_SLEEP_TIME))
      }

      return updateCompaniesHashKey(limit, skip + limit)
    }

    try {
      await updateCompaniesHashKey()
      Logger.info('Finished with success')
    } catch (e) {
      Logger.error(e, 'rotate-companies-hash-key')
    } finally {
      client.close()
    }
    Logger.info(
      `${hashKeysUpdatedSuccess} companies hash key updated with success`
    )
    Logger.info(
      `${hashKeysUpdatedErrors} companies hash key updated with errors`
    )
  }
}
