import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Settlement from 'application/core/models/settlement'
import Provider from 'application/core/models/provider'
import Charge, { status, methods } from 'application/core/models/charge'
import { publishMessage } from 'framework/core/adapters/queue'
import WalletService from 'application/core/services/wallet'
import frameworkConfig from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const taskName = 'SUBACQUIRER_EXECUTE_CHARGES'
const Logger = createLogger({ name: taskName })

export default class SubacquirerExecuteCharges {
  static type() {
    return 'manual'
  }

  static handler() {
    const today = moment().format('YYYY-MM-DD')
    const locale = frameworkConfig.core.i18n.defaultLocale
    let chargesToProcess
    let chargesError = 0

    return Promise.resolve()
      .then(findProviders)
      .then(findCharges)
      .then(processCharges)
      .finally(logStats)

    function findProviders() {
      return Provider.find({ provider_type: 'subacquirer' })
        .lean()
        .exec()
    }

    function findCharges(providers) {
      return Charge.find({
        status: status.pending,
        charge_date: {
          $lte: today
        },
        processed: false,
        charge_method: methods.balanceDebit,
        provider: {
          $in: providers.map(provider => provider.name)
        }
      })
        .lean()
        .sort({ charge_date: 1 })
        .exec()
    }

    function processCharges(charges) {
      chargesToProcess = charges.length

      Logger.info({ chargesToProcess }, 'starting-charges-processing')

      return Promise.map(
        charges,
        charge => {
          Logger.info({ charge_id: charge._id }, 'processing-charge')

          return Promise.resolve()
            .then(getSettlements)
            .spread(processCharge)
            .catch(errorHandler)

          function getSettlements() {
            return [
              getSettlement(charge.company_id, charge.affiliation_id),
              getSettlement(
                charge.destination_company_id,
                charge.destination_affiliation_id
              )
            ]

            function getSettlement(companyId, chargeAffiliation) {
              return Settlement.findOne({
                provider: 'hash',
                company_id: companyId,
                date: today
              }).then(checkSettlement)

              function checkSettlement(settlement) {
                if (!settlement) {
                  Logger.warn(
                    { companyId, chargeAffiliation },
                    'charge-settlement-fallback-used'
                  )

                  return {
                    provider: 'hash',
                    settlement_type: 'wallet',
                    status: 'processing',
                    date: today,
                    company_id: companyId,
                    amount: 0,
                    settled_amount: 0,
                    charges: [],
                    received_charges: [],
                    brands: [],
                    boleto: {
                      payables: [],
                      amount: 0
                    },
                    affiliations: [chargeAffiliation]
                  }
                } else {
                  return settlement
                }
              }
            }
          }

          function processCharge(sourceSettlement, destinationSettlement) {
            if (!R.has('paid_amount', charge)) {
              charge.paid_amount = 0
            }

            const amountDue = charge.amount - charge.paid_amount

            return Promise.resolve()
              .then(getFunds)
              .then(updateCharge)
              .spread(updateSettlements)

            function getFunds() {
              let settlementNetAmount =
                sourceSettlement.amount - sourceSettlement.settled_amount

              if (settlementNetAmount >= amountDue) {
                Logger.info(
                  { charge_id: charge._id },
                  'settlement-amount-is-sufficient'
                )

                return settlementNetAmount
              } else {
                Logger.info(
                  { charge_id: charge._id, company_id: charge.company_id },
                  'will-check-wallet-balance'
                )

                return WalletService.getBalance(locale, charge.company_id)
                  .then(
                    walletBalance =>
                      settlementNetAmount + walletBalance.available_amount
                  )
                  .catch(() => {
                    // No error is logged here since it will be considered as an empty wallet
                    // even if, technically, an error occurred (but no big consequences here)
                    return settlementNetAmount
                  })
              }
            }

            function updateCharge(availableAmount) {
              if (availableAmount > 0) {
                const isPartialCharge =
                  availableAmount >= amountDue ? false : true
                const paidAmount = isPartialCharge ? availableAmount : amountDue

                if (R.has('payment_history', charge)) {
                  charge.payment_history.push({
                    amount: paidAmount,
                    date: today,
                    destination_settlement: destinationSettlement._id,
                    source_settlement: sourceSettlement._id
                  })
                } else {
                  charge.payment_history = [
                    {
                      amount: paidAmount,
                      date: today,
                      destination_settlement: destinationSettlement._id,
                      source_settlement: sourceSettlement._id
                    }
                  ]
                }

                const updateData = {
                  status: isPartialCharge ? status.pending : status.paid,
                  paid_amount: charge.paid_amount + paidAmount,
                  processed: !isPartialCharge,
                  payment_history: charge.payment_history,
                  updated_at: moment().toDate()
                }

                Logger.info(
                  Object.assign({ charge_id: charge._id }, updateData),
                  'updating-charge'
                )

                return Promise.all([
                  Charge.findOneAndUpdate(
                    { _id: charge._id },
                    {
                      $set: updateData
                    },
                    { new: true }
                  )
                    .lean()
                    .exec(),
                  paidAmount
                ])
              } else {
                return [{}, availableAmount]
              }
            }

            function updateSettlements(newCharge, paidAmount) {
              const partialPayment = paidAmount < newCharge.amount

              if (paidAmount > 0) {
                return Promise.resolve()
                  .then(updateSource)
                  .then(updateDestination)
              }

              function updateSource() {
                sourceSettlement.amount -= paidAmount
                sourceSettlement.charges.push({
                  id: charge._id,
                  description: newCharge.description,
                  destination_company_id: newCharge.destination_company_id,
                  amount: paidAmount,
                  partial_charge: partialPayment
                })

                if (R.has('_id', sourceSettlement)) {
                  Logger.info(
                    {
                      charge_id: charge._id,
                      settlement_id: sourceSettlement._id
                    },
                    'updating-source-settlement'
                  )

                  return Settlement.findOneAndUpdate(
                    { _id: sourceSettlement._id },
                    sourceSettlement,
                    { new: true }
                  )
                    .lean()
                    .exec()
                } else {
                  Logger.info(
                    { charge_id: charge._id, settlement: sourceSettlement },
                    'creating-new-source-settlement'
                  )

                  return Settlement.create(sourceSettlement)
                }
              }

              function updateDestination() {
                destinationSettlement.amount += paidAmount
                destinationSettlement.received_charges.push({
                  id: charge._id,
                  description: newCharge.description,
                  origin_company_id: newCharge.company_id,
                  amount: paidAmount,
                  partial_charge: partialPayment
                })

                if (R.has('_id', destinationSettlement)) {
                  Logger.info(
                    {
                      charge_id: charge._id,
                      settlement_id: destinationSettlement._id
                    },
                    'updating-destination-settlement'
                  )

                  return Settlement.findOneAndUpdate(
                    { _id: destinationSettlement._id },
                    destinationSettlement,
                    { new: true }
                  )
                    .lean()
                    .exec()
                } else {
                  Logger.info(
                    {
                      charge_id: charge._id,
                      settlement: destinationSettlement
                    },
                    'creating-new-destination-settlement'
                  )
                  return Settlement.create(destinationSettlement)
                }
              }
            }
          }

          function errorHandler(err) {
            chargesError += 1

            Logger.error(
              {
                err,
                charge_id: charge._id
              },
              'failed-processing-charge'
            )

            return sendSlackMessage(
              `Error processing charge ${charge._id}`,
              err
            )
          }
        },
        { concurrency: 1 }
      )
    }

    function logStats() {
      let log = `Found ${chargesToProcess} pending charges at provider Hash: ${chargesError} encountered errors, ${chargesToProcess -
        chargesError} were processed`

      Logger.info(log)

      return sendSlackMessage(log)
    }
  }
}

function sendSlackMessage(text, err) {
  let message = {
    channel: 'finops',
    text: text
  }

  if (err) {
    message.attachments = [
      {
        text: err.message
      }
    ]
  }
  return publishMessage('Slacker', Buffer.from(JSON.stringify(message)))
}
