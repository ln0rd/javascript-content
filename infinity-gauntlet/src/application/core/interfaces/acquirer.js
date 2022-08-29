import R from 'ramda'

export default class AcquirerInterface {
  constructor(acquirer) {
    this.acquirer = acquirer

    const Methods = [
      'affiliateMerchant',
      'getAffiliation',
      'getTransaction',
      'getHardware',
      'getConciliationFile',
      'createInternalTransfer',
      'createCharge',
      'processPayableRefund',
      'registerTransaction',
      'refundTransaction',
      'registerHardware',
      'requiresProviderToAffiliate',
      'requiresProviderToTransact'
    ]

    Methods.forEach(method => {
      if (!this.acquirer[method]) {
        throw new Error(
          `AcquirerInterface: The method ${method} was not implemented!`
        )
      }
    }, this)

    Methods.forEach(method => {
      if (!R.is(Function, this.acquirer[method])) {
        throw new Error(`AcquirerInterface: ${method} is not a function!`)
      }
    }, this)
  }

  affiliateMerchant(provider, company, parentAffiliation) {
    return this.acquirer.affiliateMerchant(provider, company, parentAffiliation)
  }

  getAffiliation(affiliation) {
    return this.acquirer.getAffiliation(affiliation)
  }

  createSecurityKey(affiliation, statusCode) {
    return this.acquirer.createSecurityKey(affiliation, statusCode)
  }

  getTransaction(affiliation, transactionId, data) {
    return this.acquirer.getTransaction(affiliation, transactionId, data)
  }

  getHardware(serialNumber, affiliation) {
    return this.acquirer.getHardware(serialNumber, affiliation)
  }

  getConciliationFile(affiliationKey, date) {
    return this.acquirer.getConciliationFile(affiliationKey, date)
  }

  createInternalTransfer(from, to, amount, date, extra) {
    return this.acquirer.createInternalTransfer(from, to, amount, date, extra)
  }

  createCharge(from, to, amount, date, extra) {
    return this.acquirer.createCharge(from, to, amount, date, extra)
  }

  processPayableRefund(payable) {
    return this.acquirer.processPayableRefund(payable)
  }

  registerTransaction(affiliation, transaction, providerTransaction) {
    return this.acquirer.registerTransaction(
      affiliation,
      transaction,
      providerTransaction
    )
  }

  refundTransaction(refundAmount, transaction, affiliation) {
    return this.acquirer.refundTransaction(
      refundAmount,
      transaction,
      affiliation
    )
  }

  registerHardware(hardware, affiliation) {
    return this.acquirer.registerHardware(hardware, affiliation)
  }

  requiresProviderToAffiliate() {
    return this.acquirer.requiresProviderToAffiliate()
  }

  requiresProviderToTransact() {
    return this.acquirer.requiresProviderToTransact()
  }
}
