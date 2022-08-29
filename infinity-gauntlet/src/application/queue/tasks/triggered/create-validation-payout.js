import moment from 'moment-timezone'
import createLogger from 'framework/core/adapters/logger'
import DelayRetryError from 'framework/core/errors/delay-retry-error'
import frameworkConfig from 'framework/core/config'
import config from 'application/core/config'
import ManualValidationPayout from 'application/queue/tasks/manual/manual-validation-payout'
import Company from 'application/core/models/company'

const Logger = createLogger({ name: 'CREATE_VALIDATION_PAYOUT_TASK' })
const oneHour = 3600000

export default class CreateValidationPayout {
  static type() {
    return 'triggered'
  }

  static async handler(msg) {
    const { companyId } = JSON.parse(msg)

    const company = await Company.findOne({ _id: companyId })
      .lean()
      .exec()

    if (company.transfer_configurations.rail === 'ted') {
      delayIfOutsideTimeRestrictions()
    }

    Logger.info({ companyId }, 'createValidationPayout')
    return ManualValidationPayout.handler([companyId])

    function delayIfOutsideTimeRestrictions() {
      const hour = moment()
        .tz(config.timezone)
        .hour()

      delayIfBeforeTimeRestriction(hour)
      delayIfAfterTimeRestriction(hour)
    }

    function delayIfBeforeTimeRestriction(hour) {
      if (hour < 8) {
        throw new DelayRetryError(
          frameworkConfig.core.i18n.defaultLocale,
          oneHour * (8 - hour)
        )
      }
    }

    function delayIfAfterTimeRestriction(hour) {
      if (hour > 16) {
        throw new DelayRetryError(
          frameworkConfig.core.i18n.defaultLocale,
          oneHour * (8 + 24 - hour)
        )
      }
    }
  }
}
