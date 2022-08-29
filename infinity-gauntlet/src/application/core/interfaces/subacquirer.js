import R from 'ramda'

export default class SubacquirerInterface {
  constructor(subacquirer) {
    this.subacquirer = subacquirer

    const Methods = [
      'affiliateMerchant',
      'getAffiliation',
      'getTransaction',
      'getHardware',
      'getConciliationFile',
      // 'createInternalTransfer',
      'processPayableRefund',
      'createCharge',
      'registerTransaction',
      'refundTransaction',
      'registerHardware',
      'requiresProviderToAffiliate',
      'requiresProviderToTransact'
    ]

    Methods.forEach(method => {
      if (!this.subacquirer[method]) {
        throw new Error(
          `SubacquirerInterface: The method ${method} was not implemented!`
        )
      }
    }, this)

    Methods.forEach(method => {
      if (!R.is(Function, this.subacquirer[method])) {
        throw new Error(`SubacquirerInterface: ${method} is not a function!`)
      }
    }, this)
  }

  affiliateMerchant(provider, company, parentAffiliation) {
    return this.subacquirer.affiliateMerchant(
      provider,
      company,
      parentAffiliation
    )
  }

  getAffiliation(affiliation) {
    return this.subacquirer.getAffiliation(affiliation)
  }

  // createSecurityKey(affiliation, statusCode) {
  //   return this.subacquirer.createSecurityKey(affiliation, statusCode)
  // }

  getTransaction(affiliation, transactionId, data) {
    return this.subacquirer.getTransaction(affiliation, transactionId, data)
  }

  getHardware(provider, serialNumber, affiliation) {
    return this.subacquirer.getHardware(provider, serialNumber, affiliation)
  }

  getConciliationFile(provider, affiliationKey, date) {
    return this.subacquirer.getConciliationFile(provider, affiliationKey, date)
  }

  createInternalTransfer(provider, from, to, amount, date, extra) {
    return this.subacquirer.createInternalTransfer(
      provider,
      from,
      to,
      amount,
      date,
      extra
    )
  }

  processPayableRefund(provider, payable) {
    return this.subacquirer.processPayableRefund(provider, payable)
  }

  registerTransaction(affiliation, transaction, providerTransaction) {
    return this.subacquirer.registerTransaction(
      affiliation,
      transaction,
      providerTransaction
    )
  }

  refundTransaction(refundAmount, transaction, affiliation) {
    return this.subacquirer.refundTransaction(
      refundAmount,
      transaction,
      affiliation
    )
  }

  createCharge(from, to, amount, date, extra) {
    return this.subacquirer.createCharge(from, to, amount, date, extra)
  }

  registerHardware(hardware, affiliation) {
    return this.subacquirer.registerHardware(hardware, affiliation)
  }

  requiresProviderToAffiliate() {
    return this.subacquirer.requiresProviderToAffiliate()
  }

  requiresProviderToTransact() {
    return this.subacquirer.requiresProviderToTransact()
  }
}
