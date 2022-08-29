import Promise from 'bluebird'
import UserService from 'application/core/services/user'

export default class UserEndpoint {
  static get(req, res) {
    return Promise.resolve()
      .then(getUser)
      .then(respond)

    function getUser() {
      return UserService.getUser(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static update(req, res) {
    return Promise.resolve()
      .then(updateUser)
      .then(respond)

    function updateUser() {
      return UserService.updateUser(
        req.get('locale'),
        req.body,
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static activate(req, res) {
    return Promise.resolve()
      .then(activateUser)
      .then(respond)

    function activateUser() {
      return UserService.activateUser(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async onboardingValidation(req, res) {
    const response = await UserService.onboardingValidation(
      req.get('locale'),
      req.params.id,
      req.body
    )

    return await res.json(204, response)
  }

  static async updateValidationStatus(req, res) {
    const response = await UserService.updateValidationStatus(
      req.get('locale'),
      req.params.id,
      req.body
    )

    return await res.json(200, response)
  }

  static disable(req, res) {
    return Promise.resolve()
      .then(disableUser)
      .then(respond)

    function disableUser() {
      return UserService.disableUser(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static enable(req, res) {
    return Promise.resolve()
      .then(enableUser)
      .then(respond)

    function enableUser() {
      return UserService.enableUser(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static invite(req, res) {
    return Promise.resolve()
      .then(inviteUser)
      .then(respond)

    function inviteUser() {
      return UserService.inviteUser(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async resetPassword(req, res) {
    const body = Object.assign({}, req.body, {
      target: 'https://leo-merchant.hashboard.hash.com.br'
    })
    const response = await UserService.applyPasswordResetToken(
      req.get('locale'),
      body
    )
    return res.json(200, response)
  }

  static updatePassword(req, res) {
    return Promise.resolve()
      .then(updatePassword)
      .then(respond)

    function updatePassword() {
      return UserService.updatePassword(
        req.get('locale'),
        req.body,
        req.params.id,
        req.get('user').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static crateCredentials(req, res) {
    return Promise.resolve()
      .then(createCredentials)
      .then(respond)

    function createCredentials() {
      return UserService.createCredentials(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static validateCredentials(req, res) {
    return Promise.resolve()
      .then(checkCredentials)
      .then(respond)

    function checkCredentials() {
      return UserService.checkPassword(req.get('locale'), req.body)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async revokePermission(req, res) {
    const response = await UserService.removePermission(
      req.get('locale'),
      req.get('company').id,
      req.params.id
    )

    return res.json(200, response)
  }

  static async requestPasswordResetToken(req, res) {
    const response = await UserService.applyPasswordResetToken(
      req.get('locale'),
      req.body,
      false
    )

    return res.json(204, response)
  }

  static async requestCreatePasswordToken(req, res) {
    const response = await UserService.applyPasswordResetToken(
      req.get('locale'),
      req.body,
      true
    )

    return res.json(204, response)
  }

  static async resetPasswordViaToken(req, res) {
    const response = await UserService.resetPasswordViaToken(
      req.get('locale'),
      req.body
    )

    return res.json(204, response)
  }
}
