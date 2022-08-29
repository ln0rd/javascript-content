import { MongoClient } from 'mongodb'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ADD_COMPANIES_TO_COLLECTION' })

export default class AddCompaniesToCollections {
  static type() {
    return 'manual'
  }

  static getArgs(args) {
    const [collection, withCompany] = args
    return { collection, withCompany: withCompany === 'true' }
  }

  static async handler(args) {
    const params = this.getArgs(args)
    const { collection, withCompany } = params

    if (collection === 'payables') {
      Logger.info({ params }, 'avoid-payables-collection')
      return
    }

    Logger.info({ params }, `starting-add-companies-to-${collection}`)

    if (!collection) {
      Logger.error({ collection }, 'collection-not-found')
      return
    }

    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri)
    const db = client.db('hashlab')

    const collections = await db.listCollections().toArray()

    if (!collections.some(({ name }) => name === collection)) {
      Logger.error({ collection }, 'collection-not-found')
      return
    }

    let collectionsAffected = 0
    const updateCollection = async (limit = 1000, skip = 0) => {
      const companies = await db
        .collection('companies')
        .find()
        .project({
          name: 1,
          parent_id: 1,
          full_name: 1,
          document_number: 1,
          document_type: 1,
          company_metadata: 1,
          created_at: 1
        })
        .limit(limit)
        .skip(skip)
        .toArray()

      if (companies.length <= 0) {
        Logger.info(`Companies added to ${collection} with success`)
        return
      }

      const bulkTrx = db.collection(collection).initializeUnorderedBulkOp()

      companies.forEach(company => {
        let dataSet = {
          iso_id: company.parent_id
        }

        if (withCompany) {
          dataSet = Object.assign(dataSet, {
            _company_partial: {
              name: company.name,
              full_name: company.full_name,
              document_number: company.document_number,
              document_type: company.document_type,
              company_metadata: company.company_metadata,
              created_at: company.created_at
            }
          })
        }

        bulkTrx
          .find({
            company_id: company._id.toString()
          })
          .update({
            $set: dataSet
          })
      })

      const result = await bulkTrx.execute()

      if (!result.ok) {
        throw new Error('bulkTrx failed')
      }

      collectionsAffected += result.nModified

      Logger.info(`${result.nModified} ${collection} updated, wait 1 seconds`)

      // eslint-disable-next-line promise/avoid-new
      await new Promise(resolve => setTimeout(resolve, 1000)) // sleep 1 seconds

      return updateCollection(limit, skip + limit)
    }

    try {
      await updateCollection()
      Logger.info('Finished with success')
    } catch (e) {
      Logger.error(e, `add-companies-to-${collection}`)
    } finally {
      client.close()
    }
    Logger.info(`${collectionsAffected} ${collection} updated with success`)
  }
}
