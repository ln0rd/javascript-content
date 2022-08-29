import Promise from 'bluebird'
import config from 'application/core/config'
import createLogger from 'framework/core/adapters/logger'
import { CelerClient } from '@hashlab/celer-client'
import MerchantService from './celer-merchant'
import HardwareService from './celer-hardware'
import errorMapper from './error-mapper'
import HashCaptureSoftware from 'application/core/providers/capture-software/hash'

const Logger = createLogger({
  name: 'CELER_CAPTURE_SOFTWARE_PROVIDER'
})

export default class CelerCaptureSoftware {
  constructor(locale) {
    this.locale = locale
    this.client = new CelerClient({
      host: config.providers.capture_softwares.celer.api_url,
      username: config.providers.capture_softwares.celer.username,
      password: config.providers.capture_softwares.celer.password,
      clientId: config.providers.capture_softwares.celer.client_id,
      accessKey: config.providers.capture_softwares.celer.access_key
    })

    this.celerMerchantService = new MerchantService({ client: this.client })
    this.celerHardwareService = new HardwareService({ client: this.client })
    this.hashCaptureSoftware = new HashCaptureSoftware(locale)
  }

  getTransactions(query, affiliation) {
    Logger.info({ query, affiliation }, 'get-transactions-started')

    return Promise.resolve([])
  }

  async registerHardware(hardware, affiliation, company) {
    Logger.info({ hardware }, 'hardware-registration-started')

    // We need to sync with the hash capture system before send to celer
    try {
      await this.hashCaptureSoftware.registerHardware(
        hardware,
        affiliation,
        company
      )
    } catch (err) {
      Logger.error({ err }, 'error-while-registering-hardware-on-hash')
      throw err
    }

    try {
      const departmentId = await this.celerMerchantService.defineDepartmentId(
        company
      )

      const terminalExists = await this.celerHardwareService.doesTerminalExist({
        serial: hardware.serial_number
      })

      if (!terminalExists) {
        await this.celerHardwareService.createCelerTerminal(
          hardware,
          company.parent_id
        )
      }

      let linkingResult

      try {
        Logger.info({}, 'trying-link-requesting-tid')
        linkingResult = await this.celerHardwareService.linkTerminal(
          {
            serial: hardware.serial_number,
            departmentId,
            parentCompanyId: company.parent_id
          },
          { setTID: true }
        )
      } catch (err) {
        // Unlinking and retrying if already linked
        if (err.code === 'CEL-0006') {
          Logger.info({}, 'terminal-still-linked-on-celer')

          await this.disableHardware(hardware)

          // 2021-01-06 - Estanislau
          // Provider Hash Capture sets HW status to `disabled`,
          // but we are registering a terminal, and status must be
          // active.
          hardware.status = 'active'

          Logger.info({}, 'disabled-hardware-that-was-linked')

          return this.registerHardware(hardware, affiliation, company)
        }

        // Retrying with different params in case of TID already registered
        if (err.code === 'CEL-0013') {
          Logger.info({}, 'retrying-because-terminal-has-tid')

          linkingResult = await this.celerHardwareService.linkTerminal(
            {
              serial: hardware.serial_number,
              departmentId,
              parentCompanyId: company.parent_id
            },
            { setTID: false }
          )
        } else {
          throw err
        }
      }

      if (linkingResult.success) {
        return { success: true, status: 'active' }
      } else {
        return { success: false, status: 'disabled' }
      }
    } catch (err) {
      Logger.error(
        { err, cause: err.cause },
        'error-while-registering-celer-hardware'
      )

      err.context = { hardware, company, cause: err.cause }
      throw errorMapper(this.locale, err)
    }
  }

  async disableHardware(hardware) {
    Logger.info({ hardware }, 'hardware-deactivation-started')

    // We need to sync with the hash capture system before send to celer
    try {
      await this.hashCaptureSoftware.disableHardware(hardware)
    } catch (err) {
      Logger.error({ err }, 'error-while-deactivating-hardware-on-hash')
      throw err
    }

    const terminalExists = await this.celerHardwareService.doesTerminalExist({
      serial: hardware.serial_number
    })

    if (terminalExists) {
      try {
        await this.celerHardwareService.unlinkTerminal({
          serial: hardware.serial_number
        })
      } catch (err) {
        Logger.error({ err, cause: err.cause }, 'cannot-unlink-celer-hardware')

        err.context = { hardware, cause: err.cause }
        throw errorMapper(this.locale, err)
      }
    }

    return {
      status: 'disabled',
      success: true
    }
  }

  requiresProviderToAffiliate() {
    return false
  }

  requiresProviderToTransact() {
    return false
  }
}
