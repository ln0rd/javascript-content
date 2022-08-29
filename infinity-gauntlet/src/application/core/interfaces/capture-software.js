import R from 'ramda'

export default class CaptureSoftwareInterface {
  constructor(captureSoftware) {
    this.captureSoftware = captureSoftware

    const Methods = [
      'getTransactions',
      'registerHardware',
      'disableHardware',
      'requiresProviderToAffiliate',
      'requiresProviderToTransact'
    ]

    Methods.forEach(method => {
      if (!this.captureSoftware[method]) {
        throw new Error(
          `CaptureSoftwareInterface: The method ${method} was not implemented!`
        )
      }
    }, this)

    Methods.forEach(method => {
      if (!R.is(Function, this.captureSoftware[method])) {
        throw new Error(
          `CaptureSoftwareInterface: ${method} is not a function!`
        )
      }
    }, this)
  }

  getLogicalParameters(logical, apiKey) {
    return this.captureSoftware.getLogicalParameters(logical, apiKey)
  }

  getTransactions(query, apiKey) {
    return this.captureSoftware.getTransactions(query, apiKey)
  }

  registerHardware(hardware, affiliation, company, apiKey) {
    return this.captureSoftware.registerHardware(
      hardware,
      affiliation,
      company,
      apiKey
    )
  }

  disableHardware(hardware, apiKey) {
    return this.captureSoftware.disableHardware(hardware, apiKey)
  }

  requiresProviderToAffiliate() {
    return this.captureSoftware.requiresProviderToAffiliate()
  }

  requiresProviderToTransact() {
    return this.captureSoftware.requiresProviderToTransact()
  }
}
