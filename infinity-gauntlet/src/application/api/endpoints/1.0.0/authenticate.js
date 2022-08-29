import Promise from 'bluebird'
import JwtService from 'application/core/services/jwt'

export default class AuthenticateEndpoint {
  static createToken(req, res) {
    return Promise.resolve()
      .then(createToken)
      .then(respond)

    function createToken() {
      return JwtService.createToken(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async manualUnblock(req, res) {
    await JwtService.unblockUser(req.get('locale'), req.params.user_id)

    return res.json(200)
  }
}
