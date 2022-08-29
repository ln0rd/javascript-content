const { createLogger } = require('@hashlab/logger')
const HeaderSchema = require('./schema/HeaderSchema')
const TrailerSchema = require('./schema/TrailerSchema')
const TurnoverSchema = require('./schema/TurnoverSchema')
const { createFile } = require('./file/CSV')
const TransactionRepository = require('../data/TransactionRepository')

const Logger = createLogger({ name: 'CONCILIATION_SERVICE' })
/**
 * Class responsible for the conciliation's received data and for generating
 * the conciliation structure according to the required data
 *
 * @type {ConciliationEntry}
 */
module.exports = class ConciliationEntry {
  /**
   * Conciliate payables
   *
   * header: is header of file, contain info about company and conciliation type
   * turnover: financial turnover, it's a content of file and each line there is info related of payable (transaction, payout)
   * trailer: This info is specific important for sequential file, contain two fields size of content and record type
   * sequential_file: It's a string that contains all of this data following the position defined in spec
   *
   * spec: https://github.com/hashlab/product-development/issues/224
   *       https://github.com/hashlab/product-development/issues/225
   *
   * @param header
   * @param payables
   * @return {{trailer: Object, header: Object, turnover: [Object], sequential_file: String}}
   */
  conciliate(header, payables) {
    try {
      const { id, name, document_number, type } = header
      header = new HeaderSchema(header)
      const entries = createSequentialFile(payables, type)

      const trailer = new TrailerSchema(entries.sequential_file_length)
      Logger.info(
        {
          total_payables: payables.length,
          type,
          id,
          name,
          document_number
        },
        'conciliate-entries'
      )

      return {
        header: header.toObject(),
        turnover: entries.data,
        trailer: trailer.toObject(),
        entries_sequential_file: entries.sequential_file,
        sequential_file: `${header.toSequentialText()}${
          entries.sequential_file
        }${trailer.toSequentialText()}`
      }
    } catch (error) {
      Logger.error(
        {
          error,
          header,
          payables_id: payables.map(({ _id }) => _id)
        },
        'error-to-conciliate'
      )
      throw error
    }
  }

  /**
   * Generate conciliation csv file using conciliation model data
   * @param {ObjectMap[]} turnoverList - is necessary the conciliated field to gen this file
   * @return {String}
   */
  generateCSVFile(turnoverList) {
    Logger.info(
      { turnoverCount: turnoverList.length },
      'create-csv-conciliation-file'
    )
    return createFile(turnoverList)
  }

  /**
   *
   * @param transactionId
   * @param amount
   * @param paymentDate
   * @returns {Promise<TurnoverSchema|undefined>}
   */
  async createFinanceEntryWithDebtTransfer(
    { transactionId, amount },
    paymentDate
  ) {
    const transactionRepository = new TransactionRepository()
    const transactions = await transactionRepository.getTransactionsByIds([
      transactionId
    ])
    if (transactions.length <= 0) {
      Logger.warn(
        { transactionId, amount },
        'not-found-debt-transfer-transaction'
      )
      return undefined
    }
    const transaction = transactions[0]
    transaction.merchant_split = {
      amount
    }
    const payable = {
      type: transaction.status,
      cost: 0,
      amount,
      mdr_cost: 0,
      fee: 0,
      installment: transaction.installments,
      total_installments: transaction.installments,
      payment_date: paymentDate
    }
    return new TurnoverSchema(transaction, payable)
  }

  reconciliateAlreadyExistsFile(conciliation) {
    const conciliatedHeader = conciliation.conciliated.header
    const header = {
      id: conciliatedHeader.file_id,
      name: conciliatedHeader.company_name,
      document_number: conciliatedHeader.company_document,
      type: 'settlements'
    }
    return this.conciliate(header, conciliation.company_data.payables)
  }

  async rebuildFileWithNewEntries(
    conciliation,
    company,
    conciliationType,
    entries
  ) {
    if (conciliation.company_data.payables.length > 0) {
      conciliation.conciliated = this.reconciliateAlreadyExistsFile(
        conciliation
      )
    }

    const { name, document_number } = company

    const header = new HeaderSchema({
      id: conciliation._id,
      name,
      document_number,
      type: conciliationType
    })

    const contentLength =
      conciliation.conciliated.trailer.content_length + entries.length
    const trailer = new TrailerSchema(contentLength)
    const entriesSequentialFile = entries.reduce(
      (text, entry) => text + entry.toSequentialText(),
      ''
    )

    conciliation.conciliated.trailer = trailer.toObject()
    entries.map(entry =>
      conciliation.conciliated.turnover.push(entry.toObject())
    )

    const sequentialFileAlreadyExists =
      conciliation.conciliated.entries_sequential_file || ''
    conciliation.conciliated.sequential_file = `${header.toSequentialText()}${sequentialFileAlreadyExists}${entriesSequentialFile}${trailer.toSequentialText()}`

    return conciliation
  }
}

/**
 * Create sequential file based on TurnoverSchema to construct file rules.
 *
 * @param {[Object]} payables
 * @param {String} conciliationType - sales or settlements
 * @returns {{ data: [Object], sequential_file: String, sequential_file_length: Number }}
 */
function createSequentialFile(payables, conciliationType) {
  return payables.reduce(
    (entries, payable) => {
      const turnover = new TurnoverSchema(payable.transaction, payable)
      const transactionStatus = payable.transaction.status
      if (
        conciliationType === 'settlements' &&
        transactionStatus === 'refunded'
      ) {
        entries.data.push(turnover.toObject())
        return entries
      }
      entries.data.push(turnover.toObject())
      entries.sequential_file += turnover.toSequentialText()
      entries.sequential_file_length++
      return entries
    },
    { data: [], sequential_file: '', sequential_file_length: 0 }
  )
}
