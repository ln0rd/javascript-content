import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import AnticipationService from 'application/core/services/anticipation'

const Logger = createLogger({ name: 'SPOT_ANTICIPATION' })

export default class SpotAnticipation {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    return Promise.resolve()
      .then(parseMsg)
      .then(processAnticipation)

    function parseMsg() {
      return JSON.parse(msg)
    }

    function processAnticipation(parsedMsg) {
      Logger.info(`Processing spot anticipation request`, {
        anticipation_id: parsedMsg.anticipation_id
      })

      return AnticipationService.processAnticipation(parsedMsg.anticipation_id)
    }
  }
}
