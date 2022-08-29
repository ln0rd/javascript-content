import { MongoClient, ObjectID } from 'mongodb'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'MANUAL_FIX_TRANSACTIONS_LEO_SAP_CODE' })

export default class ManualFixTransactionLeoSapCode {
  static type() {
    return 'manual'
  }

  static async handler() {
    const client = await MongoClient.connect(frameworkConfig.core.mongodb.uri)
    const db = client.db('hashlab')
    const leoId = '5cf141b986642840656717f0'
    const getTransactionIdsAndCompanies = async () => {
      const transactionData = await db
        .collection('transactions')
        .aggregate([
          {
            $match: {
              iso_id: leoId,
              provider: 'hash',
              split_rules: { $size: 2 },
              'split_rules.company_id': { $ne: leoId },
              '_company_partial.company_metadata.sap_code': { $exists: true }
            }
          },
          {
            $project: {
              _company_partial: 1,
              split_id: {
                $reduce: {
                  input: {
                    $filter: {
                      input: '$split_rules',
                      as: 'sp',
                      cond: {
                        $ne: ['$$sp.company_id', '$company_id']
                      }
                    }
                  },
                  initialValue: '',
                  in: {
                    $concat: ['$$value', '$$this.company_id']
                  }
                }
              }
            }
          }
        ])
        .toArray()

      const companyIds = Array.from(
        new Set(transactionData.map(trx => ObjectID(trx.split_id)))
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

      const transactions = transactionData.filter(trx => {
        const company = companies.find(c => String(c._id) === trx.split_id)
        return (
          company.company_metadata.sap_code !==
          trx._company_partial.company_metadata.sap_code
        )
      })

      return [transactions, companies]
    }

    const updateTransaction = async () => {
      const [transactions, companies] = await getTransactionIdsAndCompanies()
      const bulkTrx = db.collection('transactions').initializeUnorderedBulkOp()

      transactions.forEach(trx => {
        const company = companies.find(c => String(c._id) === trx.split_id)

        bulkTrx
          .find({
            _id: trx._id
          })
          .update({
            $set: {
              '_company_partial.company_metadata.sap_code':
                company.company_metadata.sap_code
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
