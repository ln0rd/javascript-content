import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import { sendEmail } from 'framework/core/helpers/mailer'

const Logger = createLogger({ name: 'MAILER_TASK' })

export default class Mailer {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    return Promise.resolve()
      .then(parseMessage)
      .then(send)

    function parseMessage() {
      Logger.info('Parsing message body.')

      return JSON.parse(msg)
    }

    function send(params) {
      Logger.info(
        `Sending ${params.template} email to ${params.email} from ${
          params.from
        }.`
      )

      return sendEmail(
        params.layout,
        params.template,
        params.from,
        params.email,
        params.subject,
        params.locale,
        params.metadata,
        params.attachments
      )
    }
  }
}
