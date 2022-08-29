import { MongoClient, ObjectID } from 'mongodb'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'MANUAL_FIX_TRANSACTIONS_COMPANY_METADATA'
})

export default class ManualFixTransactionCompanyMetadata {
  static type() {
    return 'manual'
  }

  static async handler() {
    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri)
    const db = client.db('hashlab')
    const leoId = '5cf141b986642840656717f0'
    const getTransactionIdsAndCompanies = async () => {
      const transactions = await db
        .collection('transactions')
        .find({
          iso_id: leoId,
          provider: 'hash',
          '_company_partial.company_metadata': { $exists: false }
        })
        .project({
          company_id: 1
        })
        .toArray()

      const companyIds = Array.from(
        new Set(transactions.map(trx => ObjectID(trx.company_id)))
      )

      const companies = await db
        .collection('companies')
        .find({
          _id: { $in: companyIds }
        })
        .project({
          company_metadata: 1
        })
        .toArray()

      return [transactions, companies]
    }

    const updateTransaction = async () => {
      const [transactions, companies] = await getTransactionIdsAndCompanies()
      const bulkTrx = db.collection('transactions').initializeUnorderedBulkOp()

      transactions.forEach(trx => {
        const company = companies.find(c => String(c._id) === trx.company_id)

        bulkTrx
          .find({
            _id: trx._id
          })
          .update({
            $set: {
              '_company_partial.company_metadata': company.company_metadata
            }
          })
      })

      const result = await bulkTrx.execute()

      if (!result.ok) {
        throw new Error('bulkTrx failed')
      }

      Logger.info(`${result.nModified} transactions updated`)
    }

    try {
      await updateTransaction()
      Logger.info('Finished with success')
    } catch (e) {
      Logger.error(e)
    } finally {
      client.close()
    }
  }
}
