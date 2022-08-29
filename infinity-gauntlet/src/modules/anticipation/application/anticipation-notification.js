import sms from '@hashlab/sms-client'

import frameworkConfig from 'framework/core/config'
import config from 'application/core/config'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import { translate } from 'framework/core/adapters/i18n'

import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ANTICIPATION_NOTIFICATION_SERVICE' })
export class AnticipationNotificationService {
  async notify({ anticipation, company }) {
    const anticipationId = anticipation._id

    if (!['anticipated', 'confirmed', 'failed'].includes(anticipation.status)) {
      Logger.info(
        { status: anticipation.status },
        'anticipation-status-skip-notification'
      )

      return
    }

    if ('email' in company.contact) {
      Logger.info({ anticipationId }, 'scheduling-anticipation-email')

      await scheduleToDeliver(
        'base',
        `anticipation-status-${anticipation.status}`,
        frameworkConfig.mailer.from,
        [company.contact.email],
        'Seu pedido de antecipação',
        'pt-br'
      ).catch(err => {
        Logger.error({ err }, 'error-sending-anticipation-email')
      })
    } else {
      Logger.info({ anticipationId }, 'no-email-for-anticipation-notification')
    }

    if ('phone' in company.contact) {
      Logger.info({ anticipationId }, 'requesting-anticipation-sms')

      const client = sms.createSmsClient(config.services.sms_endpoint)

      const phone = company.contact.phone
      const fullNumber = phone.startsWith('+55') ? phone : `+55${phone}`

      const message = translate(
        `sms.anticipation_${anticipation.status}`,
        'pt-br'
      )

      await client.sendSms(message, fullNumber).catch(err => {
        Logger.error({ err }, 'error-sending-anticipation-sms')
      })
    } else {
      Logger.info({ anticipationId }, 'no-phone-for-anticipation-notification')
    }
  }
}
