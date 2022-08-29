/* eslint-disable no-await-in-loop */
const moment = require('moment')
const { createLogger } = require('@hashlab/logger')
const ConciliationRepository = require('./data/ConciliationRepository')
const CompanyRepository = require('./data/CompanyRepository')
const ConciliationEntry = require('./domain/ConciliationEntry')
const AffiliationRepository = require('./data/AffiliationRepository')
const AccountService = require('application/core/services/account').default
const ManualTaskHistoryRepository = require('./data/ManualTaskHistoryRepository')
const { getLastBusinessDay } = require('application/core/helpers/date')
const { createFile } = require('./domain/file/CSV')
const { scheduleToDeliver } = require('framework/core/helpers/mailer')
const { translate } = require('framework/core/adapters/i18n')
const frameworkConfig = require('framework/core/config').default

const Logger = createLogger({ name: 'CONCILIATION_SERVICE' })
const locale = frameworkConfig.core.i18n.defaultLocale

async function companyConciliation(type, date, companyData) {
  const conciliationRepository = new ConciliationRepository()

  const { _id: companyId } = companyData

  const existingConciliation = await conciliationRepository.findOne(
    { type, date, company_id: companyId },
    { _id: 1 }
  )

  let conciliationId
  if (existingConciliation) {
    conciliationId = existingConciliation._id
  } else {
    const newConciliation = await conciliationRepository.create({
      type,
      company_id: companyId,
      date,
      company_data: companyData
    })
    conciliationId = newConciliation._id
  }

  const { payables, name, document_number } = companyData

  const header = {
    id: conciliationId,
    name,
    document_number,
    type
  }

  const conciliatedData = new ConciliationEntry().conciliate(
    header,
    payables,
    type
  )

  return conciliationRepository.updateOne(
    { _id: conciliationId },
    { conciliated: conciliatedData, company_data: companyData }
  )
}

/**
 * build sales conciliation data to all iso merchants used the following steps:
 * find companies data(payables,transactions) -> create conciliation model -> process the conciliation data -> update model with processed data
 * @param {string} date - date format YYYY-MM-DD
 * @param {string} isoId - company ID from parent
 * @param {string|null} companyId
 * @return {Promise<*>}
 */
async function buildSaleConciliation(date, isoId, companyId = null) {
  const conciliationRepository = new ConciliationRepository()
  const isoSales = await conciliationRepository.loadSales(
    isoId,
    date,
    companyId
  )
  await generateFilesByIsoData('sales', date, isoSales)
}

/**
 *
 * @param {{}} transfers
 * @param {String} date
 * @param {Company} company
 * @returns {Promise<void>}
 */
async function conciliateDebtTransfers(transfers, company, date) {
  const companyId = company._id
  const conciliationEntry = new ConciliationEntry()
  const conciliationRepository = new ConciliationRepository()
  const conciliationType = 'settlements'

  const entries = []
  for (const transfer of transfers) {
    // eslint-disable-next-line no-await-in-loop
    const entry = await conciliationEntry.createFinanceEntryWithDebtTransfer(
      transfer,
      date
    )
    if (entry) {
      entries.push(entry)
    }
  }

  const conciliation = await conciliationRepository.createConciliationIfNotExist(
    date,
    companyId,
    conciliationType
  )
  const updatedConciliation = await conciliationEntry.rebuildFileWithNewEntries(
    conciliation,
    company,
    conciliationType,
    entries
  )

  return conciliationRepository.updateOne(
    { _id: updatedConciliation._id },
    {
      conciliated: updatedConciliation.conciliated,
      company_data: updatedConciliation.company_data
    }
  )
}

async function generateFilesByIsoData(type, date, isoData) {
  let generatedFilesCount = 0
  for (const companyData of isoData) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await companyConciliation(type, date, companyData)
      generatedFilesCount++
    } catch (err) {
      Logger.error(
        {
          err
        },
        'failures-conciliation'
      )
      throw err
    }
  }
  Logger.info(
    { total_files_generated: generatedFilesCount, date, type },
    'total-files-generated'
  )
}

/**
 * build settlement conciliation data to all iso merchants used the following steps:
 * find companies data(payables,transactions,payouts,settlements) -> create conciliation model -> process the conciliation data -> update model with processed data
 * @param {string} date - date format YYYY-MM-DD
 * @param {string} isoId - company ID from parent
 * @param {string|null} companyId
 * @return {Promise<*>}
 */
async function buildSettlementConciliation(date, isoId, companyId = null) {
  const conciliationRepository = new ConciliationRepository()
  const isoSettlements = await conciliationRepository.loadSettlements(
    isoId,
    date,
    companyId
  )
  await generateFilesByIsoData('settlements', date, isoSettlements)
}

async function buildDebtTransferConciliation(date, parentId, companyId = null) {
  const companyRepository = new CompanyRepository()
  const lastDay = await getLastBusinessDay(date)

  const payoutTime = moment('08:30', 'HH:mm')
  const startDate = moment(lastDay).set({
    hour: payoutTime.get('hour'),
    minute: payoutTime.get('minute'),
    second: payoutTime.get('second')
  })
  const endDate = moment(date).set({
    hour: payoutTime.get('hour'),
    minute: payoutTime.get('minute'),
    second: payoutTime.get('second')
  })

  let companies = []
  if (companyId) {
    const company = await companyRepository.findById(companyId, {
      _id: 1,
      name: 1,
      document_number: 1
    })
    companies = [company]
  } else {
    companies = await companyRepository.getAllMerchantsByParent(parentId)
  }

  for (const company of companies) {
    const companyId = company._id
    // eslint-disable-next-line no-await-in-loop
    const debtTransfers = await getCompanyDebtTransfers(
      companyId,
      startDate,
      endDate
    )
    if (debtTransfers.length <= 0) {
      continue
    }
    Logger.info(
      { debtTransfers, companyId, date },
      'conciliate-company-debt-transfers'
    )
    // eslint-disable-next-line no-await-in-loop
    await conciliateDebtTransfers(debtTransfers, company, date)
  }
}

/**
 *
 * @param {string} companyId
 * @param {moment.Moment} startDate
 * @param {moment.Moment} endDate
 * @returns {Promise<[]>}
 */
async function getCompanyDebtTransfers(companyId, startDate, endDate) {
  let account
  try {
    account = await AccountService.getAccountByCompanyId(companyId)
  } catch (err) {
    //Logger.warn({ companyId, err }, 'error-getting-account')
  }
  if (!account) {
    const affiliationRepository = new AffiliationRepository()
    const affiliation = await affiliationRepository.findOne(
      { company_id: companyId, provider: 'hash' },
      { wallet_id: 1 }
    )
    if (!affiliation) {
      Logger.warn({ companyId }, 'not-found-affiliation')
      return []
    }
    account = {
      balance_id: affiliation.wallet_id
    }
  }

  const walletId = account.balance_id
  return await new ManualTaskHistoryRepository().getDebtTransfers(
    walletId,
    startDate,
    endDate
  )
}

/**
 * Find all conciliation file from company without SAP then send conciliation email
 * @param {String} date - date of conciliation (YYYY-MM-DD)
 * @param {Array} types - list of conciliation types[sales, settlements] want to generate
 * @return {Promise<void>}
 */
async function generateConciliationCSVFile(date, types) {
  const conciliationRepository = new ConciliationRepository()
  const associatesConciliationList = await conciliationRepository.getCompaniesWithoutSapConciliation(
    date,
    types
  )
  for (const conciliation of associatesConciliationList) {
    const turnover = conciliation.conciliated.turnover
    const conciliationId = conciliation._id
    const companyId = conciliation.company_id
    const type = conciliation.type
    const date = conciliation.date
    const file = new ConciliationEntry().generateCSVFile(turnover)
    try {
      await conciliationRepository.updateOne(
        { _id: conciliationId },
        { 'conciliated.csv_file': file }
      )
    } catch (err) {
      Logger.error({ err, conciliationId }, 'error-to-save-csv-file')
    }
    const companyContact = await new CompanyRepository().getCompanyContact(
      companyId
    )
    if (!companyContact) {
      Logger.error({ conciliationId, companyId }, 'company-contact-not-found')
      continue
    }
    const companyEmail = companyContact.contact.email
    const companyName = companyContact.name
    const sapCode = companyContact.company_metadata.sap_code || ''
    try {
      await sendConciliationEmail({
        companyId,
        conciliationId,
        companyEmail,
        companyName,
        sapCode,
        file,
        type,
        date
      })
    } catch (err) {
      Logger.error(
        { conciliationId, companyContact },
        'error-sending-conciliation-email'
      )
    }
  }
}

/**
 * @typedef {Object} Payload
 * @property {string} companyId
 * @property {string} conciliationId
 * @property {string} companyEmail
 * @property {string} companyName
 * @property {string} file
 * @property {string} sapCode
 * @property {string} type
 * @property {string} date
 */
/**
 * @param {Payload} payload
 * @returns {Promise<void>}
 */
async function sendConciliationEmail(payload) {
  const translateType = (type, date, sapCode) => ({
    type: translate(`mailer.conciliation_file.${type}.name`, locale),
    subject: translate(`mailer.conciliation_file.${type}.subject`, locale, {
      sapCode,
      date
    })
  })
  try {
    const date = moment(payload.date).format('DD/MM/YYYY')
    const { type, subject } = translateType(payload.type, date, payload.sapCode)
    const cc = [payload.companyEmail, 'support_conciliation@hash.com.br']
    await scheduleToDeliver(
      'base',
      'conciliation-file',
      'noreply@hashlab.com.br',
      cc,
      subject,
      locale,
      { type, date },
      [
        {
          filename: `conciliation-${payload.date}.csv`,
          content: payload.file
        }
      ]
    )
    Logger.info(
      {
        cc,
        type,
        date,
        conciliationId: payload.conciliationId,
        companyId: payload.companyId,
        sapCode: payload.sapCode
      },
      'email-scheduled'
    )
  } catch (err) {
    Logger.error({ err }, 'error-to-send-email')
  }
}

/**
 * @param companyId
 * @param type
 * @param startDate
 * @param endDate
 * @returns {Promise<{file: string, companyId: string, companyEmail: string, companyName: string, type: string}>}
 */
async function generateConciliationCSVFileByDate(
  companyId,
  type,
  startDate,
  endDate
) {
  const conciliationRepository = new ConciliationRepository()
  const companyRepository = new CompanyRepository()
  const conciliationFiles = await conciliationRepository.find(
    {
      company_id: companyId,
      date: {
        $gte: startDate.format('YYYY-MM-DD'),
        $lte: endDate.format('YYYY-MM-DD')
      },
      type
    },
    {
      'conciliated.turnover': 1
    }
  )

  const mergedFiles = [].concat.apply(
    [],
    conciliationFiles.map(({ conciliated }) => conciliated.turnover)
  )
  const csvFile = createFile(mergedFiles)
  const companyContact = await companyRepository.getCompanyContact(companyId)

  return {
    companyId: companyId,
    companyEmail: companyContact.contact.email,
    companyName: companyContact.name,
    file: csvFile,
    type
  }
}

module.exports = {
  buildSaleConciliation,
  buildSettlementConciliation,
  generateConciliationCSVFile,
  buildDebtTransferConciliation,
  generateConciliationCSVFileByDate
}
