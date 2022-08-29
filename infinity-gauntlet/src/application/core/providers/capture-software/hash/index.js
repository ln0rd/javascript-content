import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'
import Company from 'application/core/models/company'
import { createClient } from '@hashlab/igsync-client'

const Logger = createLogger({
  name: 'HASH_CAPTURE_SOFTWARE_PROVIDER'
})

export default class HashCaptureSoftware {
  constructor(locale) {
    this.locale = locale
    this.client = createClient(config.providers.capture_softwares.hash.grpc_url)
  }

  getTransactions(query, affiliation) {
    Logger.info({ query, affiliation }, 'get-transactions-started')

    return Promise.resolve([])
  }

  companyData(company) {
    return {
      id: company._id.toString(),
      parent_id: company.parent_id,
      name: company.name,
      full_name: company.full_name,
      document_number: company.document_number,
      mcc: company.mcc,
      primary: company.primary,
      address: {
        city: company.address.city,
        neighborhood: company.address.neighborhood,
        state: company.address.state,
        street: company.address.street,
        street_number: company.address.street_number,
        zipcode: company.address.zipcode
      },
      contact: {
        phone: company.contact.phone
      }
    }
  }

  async prepareData(hardware, company, primaryCompany) {
    return {
      hardware: {
        id: hardware._id.toString(),
        company_id: company._id.toString(),
        hardware_provider: hardware.hardware_provider,
        terminal_model: hardware.terminal_model,
        serial_number: hardware.serial_number,
        status: hardware.status
      },
      company: this.companyData(company),
      primary_company: this.companyData(primaryCompany)
    }
  }

  async registerHardware(hardware, affiliation, company) {
    Logger.info(
      {
        hardware,
        affiliationId: affiliation._id.toString(),
        companyId: company._id.toString()
      },
      'hardware-registration-started'
    )

    // Load primary company
    const primaryCompany = await Company.findById(company.parent_id)
      .lean()
      .exec()

    const data = await this.prepareData(hardware, company, primaryCompany)
    const response = await this.client.sync(data)

    Logger.info({ hardware, response }, 'hardware-registration-completed')

    return { success: true, status: 'active' }
  }

  async disableHardware(hardware) {
    Logger.info({ hardware }, 'hardware-deactivation-started')

    // Set disabled status
    hardware.status = 'disabled'

    // Load company
    const company = await Company.findById(hardware.company_id)
      .lean()
      .exec()

    // Load primary company
    const primaryCompany = await Company.findById(company.parent_id)
      .lean()
      .exec()

    const data = await this.prepareData(hardware, company, primaryCompany)
    const response = await this.client.sync(data)

    Logger.info({ hardware, response }, 'hardware-deactivation-completed')

    return { success: true, status: 'disabled' }
  }

  requiresProviderToAffiliate() {
    return false
  }

  requiresProviderToTransact() {
    return false
  }
}
