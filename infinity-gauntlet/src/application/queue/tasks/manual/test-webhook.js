import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import sendWebHook from 'application/webhook/helpers/deliverer'

const Logger = createLogger({ name: 'TEST_WEBHOOK_TASK' })

export default class TestWebHook {
  static type() {
    return 'manual'
  }

  static handler(args) {
    return Promise.resolve()
      .then(messageLog)
      .then(deliver)
      .then(successLog)

    function messageLog() {
      Logger.info('Testing WebHook.')
    }

    function deliver() {
      if (!args[0]) {
        throw new Error('CompanyId is required.')
      }

      return sendWebHook(
        args[0],
        'test',
        'webhookevents',
        '123',
        'unfinished',
        'finished',
        {
          message: 'WebHook is working :)'
        }
      )
    }

    function successLog() {
      Logger.info('WebHook deliver called.')
    }
  }
}
