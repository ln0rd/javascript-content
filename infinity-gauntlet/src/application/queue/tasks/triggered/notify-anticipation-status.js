import createLogger from 'framework/core/adapters/logger'

import Company from 'application/core/models/company'
import Anticipation from 'application/core/models/anticipation'

import { AnticipationNotificationService } from 'modules/anticipation/application/anticipation-notification'

const Logger = createLogger({ name: 'NOTIFY_ANTICIPATION_STATUS' })

export default class NotifyAnticipationStatus {
  static type() {
    return 'triggered'
  }

  static async handler(msg) {
    const data = JSON.parse(msg)

    if (!('anticipationId' in data)) {
      Logger.error({ data }, 'no-anticipation-id-to-notify')

      return
    }

    const anticipationId = data.anticipationId

    const anticipation = await Anticipation.findOne({
      _id: anticipationId
    })
      .lean()
      .exec()

    if (!anticipation) {
      Logger.error({ anticipationId }, 'no-anticipation-to-notify')

      return
    }

    const companyId = anticipation.anticipating_company

    const company = await Company.findOne({
      _id: companyId
    })
      .lean()
      .exec()

    if (!company) {
      Logger.error({ companyId }, 'no-company-to-notify')

      return
    }

    try {
      const service = new AnticipationNotificationService()

      await service.notify({
        anticipation,
        company
      })

      Logger.info(
        { anticipationId, companyId },
        'sucessfully-notified-anticipation'
      )
    } catch (err) {
      Logger.error(
        { anticipationId: anticipation._id, err },
        'failed-to-trigger-notification'
      )
    }
  }
}
