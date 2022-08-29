/**
 * This class is meant to be a starting point to add new Acquirers.
 * It provides function implementations to satisfy `AcquirerInterface`
 * but doesn't provide any real features, returning hardcoded responses instead.
 */
export default class BoilerplateAcquirer {
  constructor(locale) {
    this.locale = locale
  }
  // Ignored parameter: parentAffiliation
  affiliateMerchant(provider, company) {
    return {
      merchant_id: '',
      key: '',
      status: 'active',
      enabled: true,
      provider_status_message: 'Aprovado',
      anticipation_type: 'spot',
      anticipation_days_interval: company.anticipation_days_interval
    }
  }

  getAffiliation(affiliation) {
    return {
      status_code: 6,
      status_message: 'Aprovado',
      company_id: affiliation.company_id
    }
  }

  getHardware(serialNumber, affiliation) {
    return {
      status_code: 6,
      status_message: 'Aprovado',
      serial_number: serialNumber,
      company_id: affiliation.company_id
    }
  }

  getConciliationFile(affiliationKey, date) {
    return {
      affiliation_key: affiliationKey,
      date: date
    }
  }

  createInternalTransfer(from, to, amount, date, extra) {
    return {
      status: 'success',
      transfer_id: '',
      amount: amount,
      extra: extra
    }
  }

  processPayableRefund(payable, affiliation) {
    return affiliation ? true : false
  }

  createCharge() {
    return {
      status: 'success',
      processed: true,
      provider_model: 'internal_transfer',
      provider_model_id: ''
    }
  }

  registerTransaction(affiliation, transaction, providerTransaction) {
    return providerTransaction
  }

  // Ignored parameters: refundAmount, transaction, affiliation
  refundTransaction() {
    return { success: true }
  }

  /**
   * Register a Hardware at the provider server. Currently, a boilerplate.
   * @param {Object} hardware Unused hardware Parameter
   * @param {{ company_id: String }} company Object containing the company_id for which the hardware should be registered
   */
  registerHardware(_, { company_id }) {
    return {
      status: 'active',
      company_id: company_id
    }
  }

  requiresProviderToAffiliate() {
    return false
  }

  requiresProviderToTransact() {
    return false
  }
}
