import Promise from 'bluebird'
import WalletService from 'application/core/services/wallet'

export default class WalletEndpoint {
  static scheduleTransfer(req, res) {
    return Promise.resolve()
      .then(scheduleTransfer)
      .then(respond)

    function scheduleTransfer() {
      return WalletService.transferAmount(
        req.get('locale'),
        req.body,
        req.get('company').id,
        true
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static cancelScheduledTransfer(req, res) {
    return Promise.resolve()
      .then(cancelScheduledTransfer)
      .then(respond)

    function cancelScheduledTransfer() {
      return WalletService.cancelScheduled(
        req.get('locale'),
        req.get('company').id,
        req.params.transferId
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getTransfers(req, res) {
    return Promise.resolve()
      .then(getTransfers)
      .then(respond)

    function getTransfers() {
      return WalletService.getTransfers(
        req.get('locale'),
        req.get('company').id,
        req.query
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getBalance(req, res) {
    return Promise.resolve()
      .then(getBalance)
      .then(respond)

    function getBalance() {
      return WalletService.getBalance(req.get('locale'), req.get('company').id)
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static transferAmount(req, res) {
    return Promise.resolve()
      .then(transferAmount)
      .then(respond)

    function transferAmount() {
      return WalletService.transferAmount(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static getChildrenBalance(req, res) {
    return Promise.resolve()
      .then(getChildrenBalance)
      .then(respond)

    function getChildrenBalance() {
      return WalletService.getChildrenBalance(
        req.get('locale'),
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async freezeChildrenAmount(req, res) {
    try {
      checkBody()

      checkAmount()

      const result = await freezeChildrenAmount()

      return respond(result)
    } catch (e) {
      catchError(e)
    }

    function catchError(e) {
      if (e.message.includes('NOT_ENOUGH_MONEY')) {
        return res.json(422, { amount: 'not enough money to freeze' })
      }
      throw e
    }

    function checkBody() {
      if (!req.body) {
        return res.json(400, { body: 'invalid body' })
      }
    }

    function checkAmount() {
      if (!req.body.amount || req.body.amount <= 0) {
        return res.json(400, { amount: 'invalid amount' })
      }
    }

    async function freezeChildrenAmount() {
      return WalletService.freezeChildrenAmount(
        req.get('locale'),
        req.params.child_id,
        req.get('company').id,
        req.body.amount
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async unfreezeChildrenAmount(req, res) {
    try {
      checkFieldsRequest()

      const result = await unfreezeChildrenAmount()

      return respond(result)
    } catch (e) {
      catchError(e)
    }

    function catchError(e) {
      if (e.message.includes('IdNotFound')) {
        return res.json(404, { frozen_amount_id: 'frozen_amount_id not found' })
      }
      throw e
    }

    function checkFieldsRequest() {
      if (!req.body) {
        return res.json(400, { body: 'invalid body' })
      }
      if (!req.body.frozen_amount_id) {
        return res.json(400, { frozen_amount_id: 'invalid frozen_amount_id' })
      }
      if (req.body.take_amount_automatically === undefined) {
        return res.json(400, {
          take_amount_automatically: 'invalid take_amount_automatically'
        })
      }
    }

    async function unfreezeChildrenAmount() {
      return WalletService.unfreezeChildrenAmount(
        req.get('locale'),
        req.params.child_id,
        req.get('company').id,
        req.body.frozen_amount_id,
        req.body.take_amount_automatically,
        req.body.request_id || 'unfreeze_amount_request'
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }
}
