import Promise from 'bluebird'
import { translate } from 'framework/core/adapters/i18n'

export default class RootEndpoint {
  static index(req, res) {
    return Promise.resolve().then(respond)

    function respond() {
      return res.json(200, {
        name: translate('endpoints.root.name', req.get('locale')),
        message: translate('endpoints.root.message', req.get('locale')),
        documentation: translate(
          'endpoints.root.documentation',
          req.get('locale')
        )
      })
    }
  }
}
