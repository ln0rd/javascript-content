import R from 'ramda'
import request from 'axios'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'SLACKER_TASK' })

export default class Slacker {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    const params = JSON.parse(msg)

    const url = config.core.slack[params.channel].url
    Logger.debug({ params, url }, 'sendingSlackMessage')

    return request.post(url, R.dissoc('channel', params), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
