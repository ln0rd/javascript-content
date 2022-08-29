import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import TransactionService from 'application/core/services/transaction'
import { paginatedResults } from 'application/core/helpers/pagination'
import RefundTransactionNotPaidError from 'application/core/errors/refund-transaction-not-paid-error'
import { transactionResponder } from 'application/core/responders/transaction'

const Logger = createLogger({ name: 'TRANSACTION_ENDPOINT' })

export default class TransactionEndpoint {
  static all(req, res) {
    return Promise.resolve()
      .then(getTransactions)
      .then(respond)

    function getTransactions() {
      return TransactionService.getTransactions(
        req.get('locale'),
        req.query,
        req.get('company').id
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static get(req, res) {
    return Promise.resolve()
      .then(getTransaction)
      .then(respond)

    function getTransaction() {
      return TransactionService.getTransaction(
        req.get('locale'),
        req.params.id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static children(req, res) {
    return Promise.resolve()
      .then(getChildrenTransactions)
      .then(respond)

    function getChildrenTransactions() {
      const user = req.get('user')
      return TransactionService.getChildrenTransactions(
        req.get('locale'),
        req.query,
        req.get('company').id,
        user ? user.id : ''
      )
    }

    function respond(response) {
      return paginatedResults(200, res, response)
    }
  }

  static async childrenTransaction(req, res) {
    const response = await TransactionService.getChildrenTransaction(
      req.get('locale'),
      req.params.id,
      req.get('company').id
    )
    return res.json(200, response)
  }

  static queueRegister(req, res) {
    return Promise.resolve()
      .then(queueRegister)
      .then(respond)

    function queueRegister() {
      try {
        req.set('special_fields', {
          provider_transaction_id: req.body.transaction_id,
          provider: req.body.provider,
          serial_number: req.body.serial_number
        })
      } catch (err) {
        Logger.error(
          { err, operation: 'queueRegister' },
          'unexpected parse error'
        )
      }

      return TransactionService.queueRegister(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static queueRegisterChild(req, res) {
    return Promise.resolve()
      .then(queueRegisterChild)
      .then(respond)

    function queueRegisterChild() {
      try {
        req.set('special_fields', {
          provider_transaction_id: req.body.transaction_id,
          provider: req.body.provider,
          serial_number: req.body.serial_number
        })
      } catch (err) {
        Logger.error(
          { err, operation: 'queueRegisterChild' },
          'unexpected parse error'
        )
      }

      return TransactionService.queueRegisterChild(
        req.get('locale'),
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static register(req, res) {
    return Promise.resolve()
      .then(register)
      .then(respond)

    function register() {
      try {
        req.set('special_fields', {
          provider_transaction_id: req.body.transaction_id,
          provider: req.body.provider,
          serial_number: req.body.serial_number
        })
      } catch (err) {
        Logger.error({ err, operation: 'register' }, 'unexpected parse error')
      }

      return TransactionService.register(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static registerChild(req, res) {
    return Promise.resolve()
      .then(registerChild)
      .then(respond)

    function registerChild() {
      return TransactionService.registerChild(
        req.get('locale'),
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async registerRefund(req, res) {
    let response

    try {
      response = await TransactionService.registerRefund(
        req.get('locale'),
        req.params.id,
        req.body,
        req.get('company').id
      )
    } catch (e) {
      if (
        e instanceof RefundTransactionNotPaidError &&
        e.transaction.status === 'refunded'
      ) {
        return res.json(200, transactionResponder(e.transaction))
      }
      throw e
    }

    return res.json(200, response)
  }

  static async refundChild(req, res) {
    let response

    try {
      response = await TransactionService.refundChild(
        req.get('locale'),
        req.params.id,
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    } catch (e) {
      if (
        e instanceof RefundTransactionNotPaidError &&
        e.transaction.status === 'refunded'
      ) {
        return res.json(200, transactionResponder(e.transaction))
      }
      throw e
    }

    return res.json(200, response)
  }

  static async refund(req, res) {
    let response

    try {
      response = await TransactionService.refund(
        req.get('locale'),
        req.params.id,
        req.body,
        req.get('company').id
      )
    } catch (e) {
      if (
        e instanceof RefundTransactionNotPaidError &&
        e.transaction.status === 'refunded'
      ) {
        return res.json(200, transactionResponder(e.transaction))
      }
      throw e
    }

    return res.json(200, response)
  }

  static simulate(req, res) {
    return Promise.resolve()
      .then(calculate)
      .then(respond)

    function calculate() {
      return TransactionService.simulateInstallments(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async calculate(req, res) {
    return res.json(
      200,
      await TransactionService.calculateInstallments(
        req.get('locale'),
        req.body,
        req.get('company').id
      )
    )
  }

  static async calculateChild(req, res) {
    return res.json(
      200,
      await TransactionService.calculateChildInstallments(
        req.get('locale'),
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    )
  }

  static simulateChild(req, res) {
    return Promise.resolve()
      .then(calculateChild)
      .then(respond)

    function calculateChild() {
      return TransactionService.simulateChildInstallments(
        req.get('locale'),
        req.body,
        req.params.child_id,
        req.get('company').id
      )
    }

    function respond(response) {
      return res.json(200, response)
    }
  }

  static async installmentInfo(req, res) {
    const installmentInfo = await TransactionService.getInstallmentInformation(
      req.get('locale'),
      req.params.transactionId,
      req.params.companyId
    )

    return res.json(200, installmentInfo)
  }
}
