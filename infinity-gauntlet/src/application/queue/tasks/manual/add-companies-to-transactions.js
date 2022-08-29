import { MongoClient } from 'mongodb'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ADD_COMPANIES_TO_TRANSACTION' })

export default class AddCompaniesToTransactions {
  static type() {
    return 'manual'
  }

  static async handler() {
    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri)
    const db = client.db('hashlab')
    let transactionsAffected = 0
    const updateTransaction = async (limit = 1000, skip = 0) => {
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
        Logger.info('Companies added to Transactions with success')
        return
      }

      const bulkTrx = db.collection('transactions').initializeUnorderedBulkOp()

      companies.forEach(company => {
        bulkTrx
          .find({
            company_id: company._id.toString()
          })
          .update({
            $set: {
              iso_id: company.parent_id,
              _company_partial: {
                name: company.name,
                full_name: company.full_name,
                document_number: company.document_number,
                document_type: company.document_type,
                company_metadata: company.company_metadata,
                created_at: company.created_at
              }
            }
          })
      })

      const result = await bulkTrx.execute()

      if (!result.ok) {
        throw new Error('bulkTrx failed')
      }

      transactionsAffected += result.nModified

      Logger.info(`${result.nModified} transactions updated, wait 5 seconds`)

      // eslint-disable-next-line promise/avoid-new
      await new Promise(resolve => setTimeout(resolve, 5000)) // sleep 5 seconds

      return updateTransaction(limit, skip + limit)
    }

    try {
      await updateTransaction()
      Logger.info('Finished with success')
    } catch (e) {
      Logger.error(e, 'add-companies-to-transaction')
    } finally {
      client.close()
    }
    Logger.info(`${transactionsAffected} transactions updated with success`)
  }
}
