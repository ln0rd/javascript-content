import R from 'ramda'
import moment from 'moment-timezone'
import Promise from 'bluebird'
import mongoose from 'mongoose'
import frameworkConfig from 'framework/core/config'
import Payable from 'application/core/models/payable'
import Affiliation from 'application/core/models/affiliation'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import EventService from 'application/core/services/event'
import Transaction from 'application/core/models/transaction'
import { getNextBusinessDay } from 'application/core/helpers/date'
import * as TransactionHelper from 'application/core/helpers/transaction'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import CreatePayablesTaskError from 'application/core/errors/create-payables-task-error'
import config from 'application/core/config'

import { publishMessage } from 'framework/core/adapters/queue'
import sendWebHook from 'application/webhook/helpers/deliverer'
import { transactionPayablesResponder } from 'application/core/responders/webhook/transaction-payables'

import { DEBIT_CARD, BOLETO } from 'application/core/domain/methods'
import {
  PERCENTAGE,
  getTransactionPricingByFeeRule
} from 'application/core/domain/pricing'
import ManualFixLeoTransactionAnticipationFees from 'application/queue/tasks/manual/manual-fix-leo-transaction-anticipation-fees'
import ManualResetLojaLeoAnticipationPaymentDate from 'application/queue/tasks/manual/manual-reset-loja-leo-anticipation-payment-date'

const Logger = createLogger({ name: 'CREATE_PAYABLES_TASK' })

const LEO_ISO_ID = '5cf141b986642840656717f0'

export default class CreatePayables {
  static type() {
    return 'triggered'
  }

  static handler(msg) {
    return Promise.resolve()
      .then(parseMsg)
      .then(getTransaction)
      .spread(createPayables)

    function parseMsg() {
      return JSON.parse(msg)
    }

    function getTransaction(parsedMsg) {
      Logger.debug(`Getting transaction ${parsedMsg.transaction_id}`)

      return [
        Transaction.findOne({
          _id: parsedMsg.transaction_id
        }),
        parsedMsg
      ]
    }

    function createPayables(transaction, parsedMsg) {
      if (!transaction) {
        const err = new ModelNotFoundError(
          frameworkConfig.core.i18n.defaultLocale,
          translate(
            'models.transaction',
            frameworkConfig.core.i18n.defaultLocale
          )
        )

        Logger.error(
          {
            err,
            transaction,
            parsedMsg
          },
          'Create payabled failed: Transaction not found!'
        )
        throw err
      }

      const company = parsedMsg.company
      const affiliation = parsedMsg.affiliation
      const origin = parsedMsg.origin
      const rule = parsedMsg.rule

      return Promise.resolve()
        .then(createBasePayable)
        .then(calculatePaymentDates)
        .then(calculateCosts)
        .then(savePayables)
        .tap(async () => {
          if (transaction.iso_id !== LEO_ISO_ID) {
            return
          }
          await ManualFixLeoTransactionAnticipationFees.recalculateByTransaction(
            transaction._id,
            company._id
          )
          await ManualResetLojaLeoAnticipationPaymentDate.recalculateByTransaction(
            transaction._id
          )
        })
        .tap(() =>
          triggerEvent(
            frameworkConfig.core.i18n.defaultLocale,
            transaction,
            'payables-created'
          )
        )
        .tap(payables => sendPayablesWebhook(payables, transaction))
        .tap(() => sendToAccountingQueue(transaction))
        .then(logSuccess)
        .catch(errorHandler)

      function createBasePayable() {
        const installmentsArray = []
        const installmentAmount = Math.floor(
          transaction.amount / transaction.installments
        )
        const firstInstallmentAmount =
          transaction.amount -
          (transaction.installments - 1) * installmentAmount
        const initialPayables = []

        for (let i = 1; i <= transaction.installments; i += 1) {
          installmentsArray.push(i)
        }

        if (!R.has('split_rules', transaction.toObject())) {
          // TODO create payables when there is no split rule
          return []
        } else if (origin === 'transaction') {
          R.forEach(splitRule => {
            const payableInstallmentAmount = Math.floor(
              splitRule.amount / transaction.installments
            )
            const payableFirstInstallmentAmount =
              splitRule.amount -
              (transaction.installments - 1) * payableInstallmentAmount

            R.forEach(installment => {
              const buildingPayable = {
                provider: transaction.provider,
                affiliation_id: splitRule.affiliation_id,
                mcc: transaction.mcc,
                origin_affiliation_id: transaction.affiliation_id,
                transaction_id: transaction._id,
                provider_transaction_id: transaction.provider_transaction_id,
                transaction_nsu: transaction.nsu,
                transaction_amount: transaction.amount,
                status: 'waiting_funds',
                capture_method: transaction.capture_method,
                split_rule_id: splitRule.id,
                total_installments: transaction.installments,
                installment,
                payment_method: transaction.payment_method,
                transaction_captured_at: wrapDate(
                  transaction.captured_at
                ).format('YYYY-MM-DD'),
                type: 'credit',
                iso_id: transaction.iso_id,
                origin_company_id: transaction.company_id,
                owner_company_id: splitRule.company_id,
                company_id: splitRule.company_id,
                fee: 0,
                mdr_fee: 0,
                anticipation_fee: 0,
                cost: 0,
                mdr_cost: 0,
                anticipation_cost: 0,
                processed: splitRule.company_id === transaction.company_id
              }

              const transactionCardBrand =
                transaction.card && transaction.card.brand
                  ? transaction.card.brand
                  : transaction.card_brand

              if (transactionCardBrand) {
                buildingPayable.card_brand = transactionCardBrand
              }

              if (splitRule.company_id === transaction.company_id) {
                buildingPayable.amount =
                  installment === 1 ? firstInstallmentAmount : installmentAmount
                buildingPayable.fee =
                  installment === 1
                    ? firstInstallmentAmount - payableFirstInstallmentAmount
                    : installmentAmount - payableInstallmentAmount
              } else {
                buildingPayable.amount =
                  installment === 1
                    ? payableFirstInstallmentAmount
                    : payableInstallmentAmount
              }

              initialPayables.push(buildingPayable)
            }, installmentsArray)
          }, transaction.split_rules)

          return initialPayables
        }

        let fee = 2.99

        if (
          rule.anticipation_fee !== null &&
          rule.anticipation_fee !== undefined
        ) {
          fee = rule.anticipation_fee
        }

        const anticipation = {
          fee,
          type: rule.anticipation_type
        }

        const mdr = getTransactionPricingByFeeRule(transaction, rule)

        Logger.info(
          {
            mdr,
            fee_rule: rule,
            transaction_id: transaction._id,
            transaction_installments: transaction.installments,
            transaction_payment_method: transaction.payment_method,
            split_rules: transaction.split_rules,
            company_id: company._id
          },
          'mdr-to-create-payables'
        )

        return Promise.resolve()
          .then(calculateInstallments)
          .then(buildPayables)

        function calculateInstallments() {
          return TransactionHelper.calculateInstallmentsAmounts(
            transaction,
            company,
            mdr,
            anticipation
          )
        }

        async function buildPayables(installments) {
          if (company.parent_id) {
            const hasSplitToISO = Boolean(
              transaction.split_rules.find(
                splitRule => splitRule.company_id === company.parent_id
              )
            )

            /**
             * We must ensure there is a split rule for the ISO, even if amount is zero
             * so that it is taken into account and the right amounts are defined below
             * so that their payables with the Fees are created.
             *
             * Since we don't have this info in the scope, we need to fetch the ISO's affiliation_id.
             */
            if (!hasSplitToISO) {
              const isoAffiliation = await Affiliation.findOne(
                {
                  company_id: company.parent_id,
                  enabled: true,
                  status: 'active',
                  provider: transaction.provider
                },
                '_id'
              )
                .lean()
                .exec()

              const splitToTheISO = {
                amount: 0,
                company_id: company.parent_id,
                affiliation_id: isoAffiliation._id,
                charge_processing_cost: true,
                id: mongoose.Types.ObjectId()
              }

              /**
               * 21/08/2019: When we add the new split rule for the ISO,
               * which will be used for the payments of fee_rules, we must
               * ensure that all other payables are not responsible for the
               * processing cost.
               *
               * If more than one split rule is the cost owner, the code
               * below will use the one of them, not necessarily the ISO's
               * split rule as the cost payor.
               *
               */
              transaction.split_rules.forEach(splitRule => {
                splitRule.charge_processing_cost = false
              })

              transaction.split_rules.push(splitToTheISO)
            }
          }

          R.forEach(splitRule => {
            const payableInstallmentAmount = Math.floor(
              splitRule.amount / transaction.installments
            )
            const payableFirstInstallmentAmount =
              splitRule.amount -
              (transaction.installments - 1) * payableInstallmentAmount

            R.forEach(installment => {
              let currentInstallment = null

              R.forEach(instaAmount => {
                if (instaAmount.installment === installment) {
                  currentInstallment = instaAmount
                }
              }, installments)

              const buildingPayable = {
                provider: transaction.provider,
                affiliation_id: splitRule.affiliation_id,
                mcc: transaction.mcc,
                origin_affiliation_id: transaction.affiliation_id,
                transaction_id: transaction._id,
                transaction_nsu: transaction.nsu,
                transaction_amount: transaction.amount,
                status: 'waiting_funds',
                capture_method: transaction.capture_method,
                provider_transaction_id: transaction.provider_transaction_id,
                split_rule_id: splitRule.id,
                total_installments: transaction.installments,
                installment,
                payment_method: transaction.payment_method,
                transaction_captured_at: wrapDate(
                  transaction.captured_at
                ).format('YYYY-MM-DD'),
                type: 'credit',
                iso_id: transaction.iso_id,
                origin_company_id: transaction.company_id,
                owner_company_id: splitRule.company_id,
                company_id: splitRule.company_id,
                fee: 0,
                mdr_fee: 0,
                anticipation_fee: 0,
                cost: 0,
                mdr_cost: 0,
                anticipation_cost: 0,
                processed: splitRule.company_id === transaction.company_id
              }

              const transactionCardBrand =
                transaction.card && transaction.card.brand
                  ? transaction.card.brand
                  : transaction.card_brand

              if (transactionCardBrand) {
                buildingPayable.card_brand = transactionCardBrand
              }

              if (origin === 'hybrid') {
                if (splitRule.company_id === transaction.company_id) {
                  buildingPayable.amount =
                    installment === 1
                      ? firstInstallmentAmount
                      : installmentAmount
                  buildingPayable.fee =
                    installment === 1
                      ? firstInstallmentAmount - payableFirstInstallmentAmount
                      : installmentAmount - payableInstallmentAmount

                  // buildingPayable.amount -= currentInstallment.fee
                  buildingPayable.fee += currentInstallment.fee
                  buildingPayable.mdr_fee = currentInstallment.mdr_fee
                  buildingPayable.anticipation_fee =
                    currentInstallment.anticipation_fee
                } else {
                  buildingPayable.amount =
                    installment === 1
                      ? payableFirstInstallmentAmount
                      : payableInstallmentAmount

                  if (splitRule.company_id === company.parent_id) {
                    buildingPayable.amount += currentInstallment.fee
                    buildingPayable.mdr_amount = currentInstallment.mdr_fee
                    buildingPayable.anticipation_amount =
                      currentInstallment.anticipation_fee
                  }
                }
              } else {
                if (splitRule.company_id === transaction.company_id) {
                  buildingPayable.amount = currentInstallment.installment_amount
                  buildingPayable.fee = currentInstallment.fee
                  buildingPayable.mdr_fee = currentInstallment.mdr_fee
                  buildingPayable.anticipation_fee =
                    currentInstallment.anticipation_fee
                } else {
                  buildingPayable.amount = currentInstallment.fee
                  buildingPayable.mdr_amount = currentInstallment.mdr_fee
                  buildingPayable.anticipation_amount =
                    currentInstallment.anticipation_fee
                }
              }

              initialPayables.push(buildingPayable)
            }, installmentsArray)
          }, transaction.split_rules)

          return initialPayables
        }
      }

      function calculatePaymentDates(payables) {
        const updatedPayables = []

        return Promise.resolve()
          .then(getPayables)
          .each(calculatePaymentDate)
          .then(respond)

        function getPayables() {
          return payables
        }

        function calculatePaymentDate(payable) {
          const updatedPayable = payable

          return Promise.resolve()
            .then(getOriginalLiquidationDate)
            .spread(getNextBusinessLiquidationDay)
            .spread(updateArray)

          function getOriginalLiquidationDate() {
            let liquidationDate = null
            let originalLiquidationDate = null

            if (
              payable.payment_method === DEBIT_CARD ||
              payable.payment_method === BOLETO
            ) {
              liquidationDate = moment(payable.transaction_captured_at).add(
                1,
                'days'
              )
              originalLiquidationDate = liquidationDate
              payable.anticipatable = false
            } else if (company.anticipation_type === 'automatic') {
              const Days = company.anticipation_days_interval || 1
              liquidationDate = wrapDate(payable.transaction_captured_at).add(
                Days,
                'days'
              )
              originalLiquidationDate = wrapDate(
                payable.transaction_captured_at
              ).add(30 * payable.installment, 'days')
            } else {
              liquidationDate = wrapDate(payable.transaction_captured_at).add(
                30 * payable.installment,
                'days'
              )
              originalLiquidationDate = liquidationDate
            }

            return [liquidationDate, originalLiquidationDate]
          }

          function getNextBusinessLiquidationDay(date, originalDate) {
            return [getNextBusinessDay(date), getNextBusinessDay(originalDate)]
          }

          function updateArray(correctDate, correctedOriginalDate) {
            updatedPayable.payment_date = correctDate.format('YYYY-MM-DD')

            if (!correctDate.isSame(correctedOriginalDate, 'day')) {
              updatedPayable.original_payment_date = correctedOriginalDate.format(
                'YYYY-MM-DD'
              )

              updatedPayable.anticipated = true
              updatedPayable.anticipatable = false
            }

            updatedPayables.push(updatedPayable)

            return
          }
        }

        function respond() {
          return updatedPayables
        }
      }

      function calculateCosts(payables) {
        if (payables.length === 0) {
          return []
        }

        const costs = TransactionHelper.getCostsFromCompanyOrAffiliation(
          transaction,
          company,
          affiliation
        )
        const installmentAmount = Math.floor(
          transaction.amount / transaction.installments
        )
        const firstInstallmentAmount =
          transaction.amount -
          (transaction.installments - 1) * installmentAmount
        const costsByInstallment = {}
        const installmentsArray = []

        for (let i = 1; i <= transaction.installments; i += 1) {
          installmentsArray.push(i)
        }

        return Promise.resolve()
          .then(getInstallmentsArray)
          .each(calculateInstallmentCost)
          .then(finishPayableCalculation)

        function getInstallmentsArray() {
          return installmentsArray
        }

        function calculateInstallmentCost(installment) {
          let liquidAmount = 0
          let mdrCost = 0

          if (costs.mdr_type === PERCENTAGE) {
            if (
              company.anticipation_type === 'spot' ||
              transaction.payment_method === DEBIT_CARD ||
              transaction.payment_method === BOLETO
            ) {
              if (installment === 1) {
                liquidAmount = Math.ceil(
                  firstInstallmentAmount * (1 - costs.mdr / 100)
                )
                mdrCost = firstInstallmentAmount - liquidAmount
              } else {
                liquidAmount = Math.ceil(
                  installmentAmount * (1 - costs.mdr / 100)
                )
                mdrCost = installmentAmount - liquidAmount
              }
            } else {
              if (installment === 1) {
                liquidAmount = Math.floor(
                  firstInstallmentAmount * (1 - costs.mdr / 100)
                )
                mdrCost = firstInstallmentAmount - liquidAmount
              } else {
                liquidAmount = Math.floor(
                  installmentAmount * (1 - costs.mdr / 100)
                )
                mdrCost = installmentAmount - liquidAmount
              }
            }
          } else if (installment === 1) {
            liquidAmount = firstInstallmentAmount - costs.mdr
            mdrCost = firstInstallmentAmount - liquidAmount
          } else {
            liquidAmount = installmentAmount - costs.mdr
            mdrCost = installmentAmount - liquidAmount
          }

          costsByInstallment[installment] = {
            mdr_cost: mdrCost,
            anticipation_cost: 0,
            cost: mdrCost
          }

          if (
            company.anticipation_type === 'spot' ||
            transaction.payment_method === DEBIT_CARD ||
            transaction.payment_method === BOLETO
          ) {
            return
          }

          const days = company.anticipation_days_interval || 1
          let liquidationDate = wrapDate(transaction.captured_at).add(
            days,
            'days'
          )
          let originalLiquidationDate = wrapDate(transaction.captured_at).add(
            30 * installment,
            'days'
          )

          return Promise.resolve()
            .then(getLiquidationDate)
            .then(getOriginalLiquidationDate)
            .spread(calculateAnticipationCost)

          function getLiquidationDate() {
            return getNextBusinessDay(liquidationDate)
          }

          function getOriginalLiquidationDate(correctedDate) {
            return [correctedDate, getNextBusinessDay(originalLiquidationDate)]
          }

          function calculateAnticipationCost(correctedDate, originalCorrected) {
            liquidationDate = correctedDate
            originalLiquidationDate = originalCorrected

            const durationDiff = originalLiquidationDate.diff(
              liquidationDate,
              'days'
            )
            const dailyfee = costs.anticipation_cost / 100 / 30
            let anticipationCost = 0

            if (installment === 1) {
              anticipationCost = Math.ceil(
                dailyfee *
                  durationDiff *
                  (firstInstallmentAmount -
                    costsByInstallment[installment].mdr_cost)
              )
            } else {
              anticipationCost = Math.ceil(
                dailyfee *
                  durationDiff *
                  (installmentAmount - costsByInstallment[installment].mdr_cost)
              )
            }

            costsByInstallment[installment].anticipation_cost = anticipationCost
            costsByInstallment[installment].cost += anticipationCost

            return
          }
        }

        function finishPayableCalculation() {
          let costOwner = false
          const updatedPayables = []

          if (R.has('split_rules', transaction.toObject())) {
            R.forEach(splitRule => {
              if (splitRule.charge_processing_cost) {
                costOwner = splitRule.company_id
              }
            }, transaction.split_rules)
          } else {
            costOwner = transaction.company_id
          }

          R.forEach(payable => {
            const newPayable = payable

            if (payable.company_id === costOwner) {
              newPayable.cost = costsByInstallment[payable.installment].cost
              newPayable.mdr_cost =
                costsByInstallment[payable.installment].mdr_cost
              newPayable.anticipation_cost =
                costsByInstallment[payable.installment].anticipation_cost
            }

            updatedPayables.push(newPayable)
          }, payables)

          return updatedPayables
        }
      }

      function savePayables(payables) {
        const dbPayables = []

        return Promise.resolve()
          .then(getPayables)
          .each(createPayable)
          .then(respond)

        function getPayables() {
          return payables
        }

        function createPayable(payable) {
          return Promise.resolve()
            .then(createOnDatabase)
            .then(finish)

          function createOnDatabase() {
            return Payable.create(payable)
          }

          function finish(dbPayable) {
            dbPayables.push(dbPayable)
          }
        }

        function respond() {
          return dbPayables
        }
      }

      function logSuccess() {
        Logger.info(
          `Payables created successfully for transaction ${transaction._id}`
        )
      }

      function errorHandler(err) {
        Logger.error(
          {
            err,
            transaction
          },
          'Error creating payables for transaction'
        )

        throw new CreatePayablesTaskError(
          frameworkConfig.core.i18n.defaultLocale,
          err
        )
      }
    }
  }
}

function wrapDate(date) {
  const momentInstance = moment(date).tz(config.timezone)

  Logger.info(
    { date, wrappedDate: momentInstance },
    'wrapped-date-with-timezone'
  )

  return momentInstance
}

async function triggerEvent(locale, transaction, eventSourceName) {
  const companyId = transaction.company_id
  const args = { transactionId: transaction._id.toString(), locale: locale }

  try {
    Logger.debug(
      { companyId, eventSourceName, args },
      'send-trigger-event-started'
    )
    await EventService.triggerEvent(companyId, eventSourceName, args)
    Logger.debug(
      { companyId, eventSourceName, args },
      'send-trigger-event-finished'
    )
  } catch (err) {
    Logger.error(
      { companyId, eventSourceName, args, err },
      'send-trigger-event-error'
    )
  }
}

async function sendPayablesWebhook(payables, transaction) {
  try {
    await sendWebHook(
      transaction.iso_id,
      'transaction_payables_created',
      'transaction',
      transaction._id.toString(),
      null,
      'waiting_funds',
      transactionPayablesResponder(payables, transaction)
    )
  } catch (err) {
    Logger.warn(
      { transaction_id: transaction._id, err },
      'transaction-payables-webhook-failed'
    )
  }
}

async function sendToAccountingQueue(transaction) {
  const body = {
    transaction_id: transaction._id
  }

  Logger.info({ body }, 'sending-to-accounting-events-queue')
  try {
    await publishMessage(
      'AccountingEventsNewTransaction',
      Buffer.from(JSON.stringify(body))
    )

    Logger.info({ body }, 'sent-to-accounting-events-queue')
  } catch (err) {
    Logger.warn({ err, body }, 'failed-to-enqueue-for-accounting-events')
  }
}
