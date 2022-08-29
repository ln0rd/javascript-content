import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import waitForAllSettled from 'p-settle'

import Affiliation from 'application/core/models/affiliation'
import createLogger from 'framework/core/adapters/logger'
import AffiliationService from 'application/core/services/affiliation'
import { ECOMMERCE, MAGSTRIPE, EMV } from 'application/core/domain/methods'

const Logger = createLogger({ name: 'ALLOW_ECOMMERCE_METHOD_TO_COMPANIES' })

async function fetchCompaniesFromCsv(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasCompanies = inputs.every(row => 'companyId' in row)
  assert(hasCompanies, 'Malformed input CSV. It must have "companyId" fields.')
  return inputs
}

async function updateAllowedMethodInAffiliationInBulk(companiesIds) {
  try {
    await Affiliation.updateMany(
      { company_id: { $in: companiesIds }, provider: 'hash' },
      { $set: { allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE] } }
    )
  } catch (err) {
    Logger.error({ err }, 'error-to-update-affiliations')
  }
}

export default class AllowEcommerceMethodToCompanies {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    if (args.length !== 1) {
      throw new Error(
        'Invalid arguments. args[0] must be a URL pointing to a CSV file.'
      )
    }

    const url = args[0]
    const companies = await fetchCompaniesFromCsv(url)
    if (!companies) {
      Logger.warn({ url }, 'companies-not-found')
    }

    const validatedCompanies = companies.map(async company => {
      try {
        await AffiliationService.validateAllowedCaptureMethod(
          company.companyId,
          { allowed_capture_methods: [EMV, MAGSTRIPE, ECOMMERCE] },
          'hash'
        )
      } catch (err) {
        Logger.warn(
          { company_id: company.companyId },
          'ecommece-method-not-allowed-to-company'
        )
        throw err
      }
      return company
    })
    const results = await waitForAllSettled(validatedCompanies)

    const failures = results.filter(operation => operation.isRejected)
    if (failures.length > 0) {
      const reasons = failures.map(({ reason }) => reason)
      Logger.info(
        {
          failures: failures.length,
          failures_reason: reasons,
          total: results.length
        },
        'finished-updating-loja-leo-payment-dates'
      )
    }

    const allowedCompaniesIds = results
      .filter(operation => !operation.isRejected)
      .map(({ value }) => value.companyId)

    if (allowedCompaniesIds.length < 0) {
      Logger.warn({ url }, 'no-company-allowed-to-add-ecommerce-method')
      return
    }

    await updateAllowedMethodInAffiliationInBulk(allowedCompaniesIds)
  }
}
