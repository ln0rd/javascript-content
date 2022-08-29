import moment from 'moment'
import Promise from 'bluebird'
import mongoose from 'mongoose'
import mongooseTime from 'mongoose-time'
import Company from 'application/core/models/company'
import Portfolio from 'application/core/models/portfolio'
import Transaction from 'application/core/models/transaction'
import FeaturesService from 'application/core/services/features'

import createLogger from 'framework/core/adapters/logger'
const Logger = createLogger({ name: 'ASSIGN_PORTFOLIO_TO_TRANSACTION_TASK' })

/**
 * When a transaction is registered we want to assign a portfolio to it if the merchant is in a portfolio at that given moment.
 */
export default class AssignPortfolioToTransaction {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    const parsedMsg = validateAndParseMessage(msg)

    return Promise.resolve()
      .then(() => main(parsedMsg))
      .catch(saveShouldNotRetryErrors)

    function validateAndParseMessage(rawMsg) {
      const msg = JSON.parse(rawMsg)
      // FIXME: use camelize && maybe a schema validation such as ajv
      const parsedMessage = {
        transactionId: msg.transaction_id,
        merchantId: msg.merchant_id,
        createdAt: msg.created_at
      }

      return parsedMessage
    }

    function saveShouldNotRetryErrors(err) {
      if (err.shouldRetry) {
        Logger.error({ err, context: err.context, msg: parsedMsg }, err.message)
        return saveTaskError(parsedMsg, err)
      } else {
        throw err
      }
    }
  }
}

async function main(msg) {
  const { transactionId, merchantId, createdAt } = msg

  const merchant = await Company.findById(merchantId, 'portfolio parent_id')
  if (!merchant) {
    throw shouldNotRetryError(
      { merchantId, reason: 'merchant_not_found' },
      `Merchant not found with id=${merchantId}`
    )
  }

  /**
   * Not all parent ids have portfolio
   * We only want to assign portfolio to merchant's transactions
   * if its parent has portfolios
   */
  if (!merchant.parent_id) {
    throw shouldNotRetryError(
      { merchantId, reason: 'parent_company_not_found' },
      `Parent company not found! merchant_id=${merchantId}`
    )
  }
  const portfolioEnabled = await FeaturesService.isEnabled(
    merchant.parent_id,
    'portfolio'
  )
  if (!portfolioEnabled) {
    Logger.warn({ msg }, 'SKIPPING: portfolio feature not enabled')
    return
  }

  // Ensure idempotency
  const trx = await Transaction.findById(transactionId, 'portfolio')
  if (trx.portfolio) {
    Logger.warn({ msg }, 'SKIPPING: Transaction already has portfolio')
    return
  }

  warnIfTookTooLongToRunTask(createdAt)

  if (!merchant.portfolio) {
    Logger.warn({ msg }, 'SKIPPING: merchant has no portfolio')
    return
  }
  const portfolio = await Portfolio.findById(merchant.portfolio)
  if (!portfolio) {
    throw shouldNotRetryError(
      {
        portfolioId: merchant.portfolio,
        reason: 'portfolio_not_found'
      },
      `Portfolio not found with id=${merchant.portfolio}`
    )
  }

  // Update transaction
  const updatedTransaction = await Transaction.findOneAndUpdate(
    { _id: transactionId, company_id: merchantId },
    { $set: { portfolio } },
    { new: true }
  )
  const trxPortfolio = updatedTransaction.portfolio
  if (
    !trxPortfolio ||
    !trxPortfolio._id ||
    trxPortfolio._id.toString() !== portfolio._id.toString()
  ) {
    let err = new Error(
      `Updated transaction has wrong portfolio._id=${
        updatedTransaction.portfolio._id
      }. Expected portfolio._id=${portfolio._id}`
    )
    err.name = 'PortfolioIdsMismatch'
    throw err
  }
}

// If the task took to long to run (i.e msg was put in the queue and the worker was down)
// we risk consistency issues:
// 1. We assign the wrong portfolio because the portfolio may have changed
function warnIfTookTooLongToRunTask(_createdAt) {
  const now = moment()
  const createdAt = moment(_createdAt)
  const diff = now.diff(createdAt)

  if (diff > 30000) {
    Logger.warn(
      {
        now: now.toISOString(),
        createdAt: createdAt.toISOString(),
        diffMs: diff
      },
      'took_too_long_to_run_task'
    )
  }
}

function shouldNotRetryError(ctx, errMsg) {
  let err = new Error(errMsg)
  err.name = ctx.reason
  delete ctx.reason
  err.context = ctx
  err.shouldRetry = true
  return err
}

/*
 * This function dumps long stack traces for exceptions having a cause()
 * method. The error classes from
 * [verror](https://github.com/davepacheco/node-verror) and
 * [restify v2.0](https://github.com/mcavage/node-restify) are examples.
 *
 * Based on `dumpException` in
 * https://github.com/davepacheco/node-extsprintf/blob/master/lib/extsprintf.js
 */
function getFullErrorStack(ex) {
  var ret = ex.stack || ex.toString()
  if (ex.cause && typeof ex.cause === 'function') {
    var cex = ex.cause()
    if (cex) {
      ret += '\nCaused by: ' + getFullErrorStack(cex)
    }
  }
  return ret
}

// Serialize an Error object
// (Core error properties are enumerable in node 0.4, not in 0.6).
function errSerializer(err) {
  if (!err || !err.stack) return err
  var obj = {
    message: err.message,
    name: err.name,
    stack: getFullErrorStack(err),
    code: err.code,
    signal: err.signal
  }
  return obj
}

const { Schema } = mongoose
const { ObjectId, Mixed } = Schema.Types

const PortfolioAssignmentsErrorsHistorySchema = new Schema({
  _id: {
    type: ObjectId,
    required: true,
    auto: true
  },
  err: Mixed,
  taskMessage: Mixed
})

PortfolioAssignmentsErrorsHistorySchema.plugin(mongooseTime())

const PortfolioAssignmentsErrorsHistory = mongoose.model(
  'PortfolioAssignmentsErrorsHistory',
  PortfolioAssignmentsErrorsHistorySchema
)

function saveTaskError(msg, err) {
  return Promise.resolve()
    .then(() =>
      PortfolioAssignmentsErrorsHistory.create({
        err: errSerializer(err),
        taskMessage: msg
      })
    )
    .catch(err => {
      Logger.error({ err }, 'task_error_save_failed')
    })
}
