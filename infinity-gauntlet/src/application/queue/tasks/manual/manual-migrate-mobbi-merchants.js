import Affiliation from 'application/core/models/affiliation'
import Company from 'application/core/models/company'
import Hardware from 'application/core/models/capture-hardware'
import HardwareService from 'application/core/services/hardware'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import axios from 'axios'
import createLogger from 'framework/core/adapters/logger'
import frameworkConfig from 'framework/core/config'
import mongoose from 'mongoose'
import parseCSV from 'neat-csv'
import { translate } from 'framework/core/adapters/i18n'

const Logger = createLogger({ name: 'MANUAL_MIGRATE_MOBBI_MERCHANTS' })

export async function getCSV(url) {
  // Download csv
  Logger.info({ url }, 'csv-download-started')
  let response
  try {
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'csv-download-error')
    throw err
  }
  Logger.info({ url }, 'csv-download-finished')

  // Validate csv data
  const inputs = await parseCSV(response.data)
  const hasMandatoryFields = inputs.every(row => 'companyId' in row)
  if (!hasMandatoryFields) {
    throw new Error(
      'Malformed input CSV. It must have "companyID,serialNumber" fields.'
    )
  }

  return inputs
}

export async function migrateMerchant(companyId) {
  const mobbiCompanyId = '59dcd1f57033b90004b32339'
  const internalProvider = 'pags'
  // Mobbi (Will use the same Leo Madeiras affiliation initially)
  // Affiliations: Leo (124878730) / Mobbi (142289490)
  const internalMerchantId = '124878730'
  const mcc = '7399'

  // Get company
  const companyFilter = {
    _id: mongoose.Types.ObjectId(companyId),
    parent_id: mobbiCompanyId
  }
  let company
  try {
    company = await Company.findOne(companyFilter, '_id').exec()
  } catch (err) {
    Logger.error({ companyFilter, err }, 'company-find')
    throw err
  }
  if (company === null) {
    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.company', frameworkConfig.core.i18n.defaultLocale)
    )
  }
  Logger.info({ id: company._id.toString() }, 'company-found')

  // Update company mcc
  company.mcc = mcc
  try {
    await company.save()
  } catch (err) {
    Logger.error({ id: company._id.toString(), err }, 'company-update')
    throw err
  }
  Logger.info({ id: company._id.toString() }, 'company-updated')

  // Get affiliation
  const affiliationFilter = {
    company_id: company._id.toString(),
    provider: 'hash',
    status: 'active'
  }
  let affiliation
  try {
    affiliation = await Affiliation.findOne(affiliationFilter).exec()
  } catch (err) {
    Logger.error({ affiliationFilter, err }, 'affiliation-find')
    throw err
  }
  if (affiliation === null) {
    throw new ModelNotFoundError(
      frameworkConfig.core.i18n.defaultLocale,
      translate('models.affiliation', frameworkConfig.core.i18n.defaultLocale)
    )
  }
  Logger.info({ affiliation }, 'affiliation-found')

  // Update affiliation
  affiliation.internal_provider = internalProvider
  affiliation.internal_merchant_id = internalMerchantId
  try {
    await affiliation.save()
  } catch (err) {
    Logger.error({ affiliationId: affiliation.id, err }, 'affiliation-update')
    throw err
  }
  Logger.info({ affiliation }, 'affiliation-updated')

  // Get hardwares for disable
  const hardwareFilter = {
    company_id: company._id.toString(),
    software_provider: { $ne: 'celer' },
    status: 'active'
  }
  let hardwares
  try {
    hardwares = await Hardware.find(hardwareFilter, '_id')
      .lean()
      .exec()
  } catch (err) {
    Logger.error({ hardwareFilter, err }, 'hardwares-find')
    throw err
  }
  Logger.info({ hardwares }, 'hardwares-found')

  // Disable hardwares
  for (const hardware of hardwares) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await HardwareService.disableChild(
        frameworkConfig.core.i18n.defaultLocale,
        hardware._id.toString(),
        company._id.toString(),
        mobbiCompanyId
      )
    } catch (err) {
      Logger.error({ hardware, err }, 'hardware-disable')
      throw err
    }
    Logger.info({ hardware }, 'hardware-disabled')
  }

  // return result
  return {
    company_updated: company._id.toString(),
    affiliation_updated: affiliation._id.toString(),
    hardwares_disabled: hardwares.map(hw => hw._id.toString())
  }
}

export default class ManualMigrateMobbiMerchants {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'manual-migrate-mobbi-merchants-started')

    if (args.length !== 1) {
      throw new Error(
        'Invalid arguments. args[0] must be a URL pointing to a CSV file.'
      )
    }

    // Get csv
    let inputs
    try {
      inputs = await getCSV(args[0])
    } catch (err) {
      Logger.error({ err }, 'failed-to-get-csv')
      return
    }

    // Migrate merchants
    const totalCount = inputs.length
    let failCount = 0
    let successCount = 0
    for (const input of inputs) {
      let result
      try {
        // eslint-disable-next-line no-await-in-loop
        result = await migrateMerchant(input.companyId)
        successCount++
      } catch (err) {
        failCount++
        Logger.error(
          { companyId: input.companyId, serialNumber: input.serialNumber, err },
          'failed-to-migrate-merchant'
        )
      }
      Logger.info(
        {
          companyId: input.companyId,
          serialNumber: input.serialNumber,
          result
        },
        'migrate-merchant'
      )
    }

    Logger.info(
      { total: totalCount, successes: successCount, fails: failCount },
      'migrate-merchant-results'
    )
  }
}
