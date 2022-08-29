import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'CELER_HARDWARE_SERVICE'
})

const acquirerIdAtCeler = parentCompanyId => {
  switch (parentCompanyId) {
    // Leo Madeiras
    case '5cf141b986642840656717f0':
      return 10
    // Mobbi (Will use the same Leo Madeiras affiliation initially)
    case '59dcd1f57033b90004b32339':
      return 10
    default:
      return 10
  }
}

export default class CelerHardwareService {
  constructor({ client }) {
    this.client = client
  }

  createCelerTerminal(hardware, parentCompanyId) {
    Logger.info({ hardware }, 'creating-celer-terminal')
    return this.client.createTerminal({
      serial: hardware.serial_number,
      acquiresToRequestTID: [acquirerIdAtCeler(parentCompanyId)]
    })
  }

  async doesTerminalExist({ serial }) {
    Logger.info({ serial }, 'checking-if-celer-terminal-exists')

    let apiResponse
    try {
      apiResponse = await this.client.showTerminal({
        equipmentSerial: serial
      })

      const equipment = apiResponse.response.equipment

      const exists = !!equipment
      Logger.info({ exists, serial }, 'celer-terminal-exists-result')

      return exists
    } catch (err) {
      Logger.error({ err }, 'celer-error-checking-terminal-existence')

      return false
    }
  }

  unlinkTerminal({ serial }) {
    return this.client.unlinkTerminal({
      serialId: serial
    })
  }

  linkTerminal({ serial, departmentId, parentCompanyId }, options) {
    const payload = {
      serial,
      departmentInsideCode: departmentId
    }

    if (!options || options.setTID) {
      payload.acquiresToRequestTID = [acquirerIdAtCeler(parentCompanyId)]
    }

    return this.client.linkTerminalToMerchant(payload)
  }
}
