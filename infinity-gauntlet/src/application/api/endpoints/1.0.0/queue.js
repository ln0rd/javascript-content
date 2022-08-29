import Promise from 'bluebird'
import { translate } from 'framework/core/adapters/i18n'

import {
  connectQueue,
  publishMessageWithConnection
} from 'framework/core/adapters/queue'

export default class QueueEndpoint {
  static register(req, res) {
    return Promise.resolve()
      .then(connect)
      .then(publish)
      .then(respond)

    function connect() {
      return connectQueue()
    }

    function publish(channel) {
      return publishMessageWithConnection(
        channel,
        'RegisterTransaction',
        Buffer.from(JSON.stringify(req.body))
      )
    }

    function respond() {
      return res.send(200, {
        message: translate('endpoints.queue.message', req.get('locale'))
      })
    }
  }
}
