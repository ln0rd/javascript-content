import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import axios from 'axios'
import assert from 'assert'
import parseCSV from 'neat-csv'
import { publishMessage } from 'framework/core/adapters/queue'
import Payable from 'application/core/models/payable'
import Company from 'application/core/models/company'
import FeeRule from 'application/core/models/fee-rule'
import createLogger from 'framework/core/adapters/logger'
import Transaction from 'application/core/models/transaction'
import Affiliation from 'application/core/models/affiliation'
import { createSplitWithFeeRule } from 'application/core/helpers/transaction'

const Logger = createLogger({ name: 'FIX_TRANSACTIONS_WITH_MISSING_PAYABLES' })

function setAffiliation(splitRules) {
  Logger.info({ splitRules }, 'set-affiliation')
  return Promise.all(
    splitRules.map(async rule => {
      if (rule.affiliation_id) {
        Logger.info({ rule }, 'split-rule-already-with-affiliation')
        return rule
      }

      Logger.info({ company_id: rule.company_id }, 'get-affiliation')
      const affiliation = await Affiliation.findOne({
        provider: 'hash',
        company_id: rule.company_id.toString()
      })
        .lean()
        .exec()

      if (!affiliation) {
        Logger.warn({ rule }, 'company-without-affiliation')
        return rule
      }
      Logger.info(
        { company_id: rule.company_id, affiliation_id: affiliation._id },
        'affiliation-assigned'
      )
      rule.affiliation_id = affiliation._id.toString()
      return rule
    })
  )
}

async function fetchTransactionsFromCsv(url) {
  let response
  try {
    Logger.info({ url }, 'downloading-csv')
    response = await axios({ url, method: 'GET' })
  } catch (err) {
    Logger.error({ err }, 'failed-to-download-csv')
    throw err
  }
  const inputs = await parseCSV(response.data)
  const hasTransactions = inputs.every(row => 'transactionId' in row)
  assert(
    hasTransactions,
    'Malformed input CSV. It must have "transactionId" fields.'
  )
  return inputs.map(({ transactionId }) => transactionId)
}

export default class FixTransactionsWithMissingPayables {
  static type() {
    return 'manual'
  }

  static async handler(args) {
    Logger.info({ args }, 'fix-transactions-with-missing-payables')

    return Promise.resolve(args)
      .tap(logStart)
      .then(findTransactions)
      .tap(logCount)
      .each(createPayablesForTransactionIfNeeded)

    function logStart() {
      Logger.info('Start fix transactions with missing payables!')
    }

    /** Finds all transactions with the corresponding params
     *
     * @returns Promise<Array<Transaction>>
     */
    async function findTransactions(args) {
      let query = {
        status: 'paid',
        'card.brand': {
          $in: ['visa', 'mastercard', 'elo', 'amex', 'hiper']
        },
        provider: 'hash',
        created_at: {
          $gte: moment()
            .subtract(30, 'days')
            .startOf('day')
            .toDate(),
          $lt: moment()
            .endOf('day')
            .toDate()
        }
      }
      if (args.length > 0 && args[0] !== '') {
        const transactionsIds = await fetchTransactionsFromCsv(args[0])
        query = { _id: { $in: transactionsIds } }
      }
      return Transaction.find(query)
        .lean()
        .exec()
    }

    function logCount(transactions) {
      Logger.info(`Processing ${transactions.length} transactions!`)
    }

    /** Tries to create a payable using the transaction, if the is already
     * any payable for the transaction it halts the operation.
     *
     * @param transaction
     * @returns Promise
     */
    function createPayablesForTransactionIfNeeded(transaction) {
      return Promise.resolve()
        .then(getPayablesForTransaction)
        .then(gatherInfoAndCreatePayables)

      /** Simple query, gets a transaction and returns a promise with
       * a list of payables.
       *
       * @param transaction
       * @returns Promise<Array<Payable>>
       */
      function getPayablesForTransaction() {
        return Payable.find({ transaction_id: transaction._id })
          .lean()
          .exec()
      }

      /** Gathers necessary info (company, fee rule and affiliation) for a payable
       * and tries to create one.
       *
       * @param transaction
       * @returns Promise
       */
      function gatherInfoAndCreatePayables(payables) {
        if (payables && payables.length > 0) {
          return Promise.resolve()
        }

        Logger.info(
          `Transaction ${transaction._id} is buggy, let's fix this babe!`
        )

        return Promise.resolve()
          .then(getFeeForTransaction)
          .then(getCompanyForTransaction)
          .spread(getAffiliationForTransaction)
          .spread(createPayables)

        function getFeeForTransaction() {
          return FeeRule.findOne({
            company_id: transaction.company_id,
            enabled: true
          })
            .lean()
            .exec()
        }

        function getCompanyForTransaction(rule) {
          return [
            rule,
            Company.findOne({ _id: transaction.company_id })
              .lean()
              .exec()
          ]
        }

        function getAffiliationForTransaction(rule, company) {
          return [
            rule,
            company,
            Affiliation.findOne({
              _id: transaction.affiliation_id
            })
              .lean()
              .exec()
          ]
        }

        /** Publishes the params to create the payable to the queue adding the
         * split origin as part of the payload.
         *
         * @param transaction
         * @param rule
         * @param company
         * @param affiliation
         *
         * @returns Promise
         */
        function createPayables(rule, company, affiliation) {
          return Promise.resolve()
            .then(findOrigin)
            .then(sendToPayableQueue)

          /** Discovers the correct split origin for a transaction.
           *
           * Calculates the split rule again and compares with what is saved in
           * the transaction, using the result to discover the correct origin.
           *
           * @returns Promise<String>
           */
          function findOrigin() {
            transaction.card_brand = transaction.card.brand

            return Promise.resolve()
              .then(makeSplitRule)
              .then(setAffiliation)
              .then(createOrigin)

            function makeSplitRule() {
              return rule
                ? createSplitWithFeeRule(rule, transaction, company)
                : []
            }

            function createOrigin(splitRules) {
              const builtCompanyRule = R.find(
                R.propEq('company_id', transaction.company_id)
              )(splitRules)

              let transactionCompanyRule = R.find(
                R.propEq('company_id', transaction.company_id)
              )(transaction.split_rules)

              if (transaction.split_rules.length === 0) {
                transactionCompanyRule = builtCompanyRule

                if (builtCompanyRule) {
                  return Transaction.findOne({ _id: transaction._id }).then(
                    transactionDb => {
                      transactionDb.split_rules = splitRules
                      transactionDb.save()

                      return 'fee_rule'
                    }
                  )
                }
              }

              if (!rule) {
                Logger.info('No fee rule for this transaction')

                return 'transaction'
              }

              if (splitRules.length === 0) {
                Logger.info('Empty split rule built from fee rule')
                return 'transaction'
              }

              if (builtCompanyRule.amount === transactionCompanyRule.amount) {
                Logger.info('Found split was from fee rule')
                return 'fee_rule'
              }

              return 'hybrid'
            }
          }

          function sendToPayableQueue(origin) {
            const params = JSON.stringify({
              transaction_id: transaction._id,
              company,
              affiliation,
              rule,
              origin
            })

            // Logger.info(`
            //   Transaction ${transaction._id} have what it takes to be fixed:
            //   payment_method: ${transaction.payment_method},
            //   installments: ${transaction.installments},
            //   card_brand: ${transaction.card_brand},
            //   feeRule: ${JSON.stringify(rule)},
            //   origin: ${origin}
            //
            // `)

            Logger.info('Sending transaction to Payable Queue')

            /** Returns the name of the task that creates the payables */
            function createPayableTask() {
              return 'CreatePayables'
            }

            return publishMessage(createPayableTask(), Buffer.from(params))
          }
        }
      }
    }
  }
}
