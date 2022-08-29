/* eslint-disable no-await-in-loop */
import CaptureHardware from 'application/core/models/capture-hardware'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'MANUAL_FIX_S920_SERIAL_NUMBER'
})

export default class ManualFixS920SerialNumber {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'start-process')

    // Get all active s920 hardwares
    let hardwares
    try {
      hardwares = await CaptureHardware.find({
        status: 'active',
        terminal_model: 's920'
      }).exec()
    } catch (err) {
      Logger.error({ err }, 'query-hardwares-failed')
      throw err
    }
    let lowerCaseAndUpperCaseHardwaresFound = 0
    let hardwaresUpdated = 0

    for (const hardware of hardwares) {
      const serial = hardware.serial_number
      const lowerCaseSerial = serial.toLowerCase()
      const upperCaseSerial = serial.toUpperCase()

      // Get hardwares with lowercase serial numbers only, we have some s920 hardware that have
      // serial with only numbers (probably invalid registers)
      if (serial === lowerCaseSerial && serial !== upperCaseSerial) {
        const lowerCaseActiveHardware = hardware

        // Try to load active hardware with uppercase serial number
        let upperCaseActiveHardware
        try {
          upperCaseActiveHardware = await CaptureHardware.findOne({
            status: 'active',
            terminal_model: 's920',
            serial_number: upperCaseSerial
          })
            .sort({ created_at: 'desc' })
            .exec()
        } catch (err) {
          Logger.Error(
            { err, upperCaseSerial },
            'query-uppercase-hardware-failed'
          )
          continue
        }

        if (upperCaseActiveHardware) {
          Logger.info(
            {
              lowercase_hardware: lowerCaseActiveHardware,
              uppercase_hardware: upperCaseActiveHardware
            },
            'lowercase-and-uppercase-hardwares-found'
          )
          lowerCaseAndUpperCaseHardwaresFound++
          continue
        }

        // Update lowerCaseActiveHardwareBefore with uppercase serial number
        try {
          const lowerCaseActiveHardwareBefore = lowerCaseActiveHardware.toObject()
          lowerCaseActiveHardware.serial_number = upperCaseSerial
          await lowerCaseActiveHardware.save()
          Logger.info(
            {
              before: lowerCaseActiveHardwareBefore,
              after: lowerCaseActiveHardware.toObject()
            },
            'hardware-updated'
          )
          hardwaresUpdated++
        } catch (err) {
          Logger.Error(
            { err, hardware: lowerCaseActiveHardware },
            'update-hardware-failed'
          )
          continue
        }
      }
    }

    Logger.info(
      {
        hardwares_found: hardwares.length,
        hardwares_updated: hardwaresUpdated,
        lowercase_and_uppercase_hardwares_found: lowerCaseAndUpperCaseHardwaresFound
      },
      'process-finished'
    )
  }
}
