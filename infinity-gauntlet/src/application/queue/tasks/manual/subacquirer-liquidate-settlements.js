/* eslint-disable no-await-in-loop */
import moment from 'moment'
import Promise from 'bluebird'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import Provider from 'application/core/models/provider'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import Settlement from 'application/core/models/settlement'
import { createWalletClient } from '@hashlab/wallet-client'
import Affiliation from 'application/core/models/affiliation'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { createId } from 'application/core/domain/breadcrumbs'
import AccountService from 'application/core/services/account'
import { publishMessage } from 'framework/core/adapters/queue'

const taskName = 'SUBACQUIRER_LIQUIDATE_SETTLEMENTS'
const Logger = createLogger({ name: taskName })

export default class SubacquirerLiquidateSettlements {
  static type() {
    return 'manual'
  }

  static handler(args) {
    Logger.info('Starting liquidation of processing settlements')

    let version = typeof args === 'undefined' || args.length < 1 ? 1 : args[0]
    Logger.info(`Version: ${version}`)

    const SettlementsPromise = Promise.resolve()
      .then(findProviders)
      .tap(checkProviders)
      .each(liquidateSettlements)
      .then(triggerWebhook)
      .then(messageLog)

    function findProviders() {
      Logger.info('Finding providers...')

      return Provider.find({
        provider_type: 'subacquirer',
        enabled: true
      })
    }

    function checkProviders(providers) {
      if (providers.length === 0) {
        Logger.info('No enabled subacquirer providers were found')

        return SettlementsPromise.cancel()
      }

      Logger.info(`${providers.length} providers found.`)
    }

    async function liquidateSettlements(provider) {
      Logger.info({ provider: 'hash' }, 'starting-liquidate-settlements')

      const settlements = await findSettlements()

      Logger.info({ count: settlements.length }, 'settlements-to-be-processed')

      for (const settlement of settlements) {
        try {
          await liquidateSettlement(settlement)
        } catch (err) {
          Logger.error(
            { err, settlement_id: settlement._id },
            'liquidating-settlement-error'
          )
        }
      }

      function findSettlements() {
        return Settlement.find({
          provider: provider.name,
          status: 'processing'
        })
          .select({
            _id: 1,
            company_id: 1,
            amount: 1,
            settled_amount: 1,
            status: 1,
            wallet_id: 1
          })
          .lean()
          .exec()
      }

      function liquidateSettlement(settlement) {
        Logger.info({ settlement_id: settlement._id }, 'processing-settlement')

        return Promise.resolve()
          .then(findAffiliation)
          .tap(checkAffiliation)
          .then(sendMoneyToWallet)
          .spread(updateSettlement)
          .catch(settlementError)

        function findAffiliation() {
          Logger.info('Getting affiliation...')
          return Affiliation.findOne({
            company_id: settlement.company_id,
            provider: provider.name
          })
            .select({ company_id: 1, wallet_id: 1 })
            .exec()
        }

        function checkAffiliation(affiliation) {
          if (!affiliation) {
            throw new ModelNotFoundError(
              frameworkConfig.core.i18n.defaultLocale,
              translate(
                'models.affiliation',
                frameworkConfig.core.i18n.defaultLocale
              )
            )
          }
        }

        async function sendMoneyToWallet(affiliation) {
          let account = await AccountService.getAccountByCompanyId(
            affiliation.company_id
          )

          if (!account) {
            if (!affiliation.wallet_id) {
              Logger.warn('Wallet not found on account and affiliation')

              throw ModelNotFoundError(
                frameworkConfig.core.i18n.defaultLocale,
                translate(
                  'models.accounts',
                  frameworkConfig.core.i18n.defaultLocale
                )
              )
            }
            account = {
              balance_id: affiliation.wallet_id,
              registration_id: affiliation.company_id
            }
          }

          if (settlement.amount === settlement.settled_amount) {
            Logger.info('Settled amount already equals to amount')

            return [settlement.settled_amount, account.balance_id]
          }

          const amountToSend = settlement.amount - settlement.settled_amount

          return Promise.resolve()
            .then(sendToWallet)
            .then(respond)

          function sendToWallet() {
            return Promise.resolve()
              .then(instantiateWallet)
              .then(sendMoney)

            function instantiateWallet() {
              Logger.info('Instantiating wallet...')

              return createWalletClient(config.services.wallet_endpoint)
            }

            function sendMoney(walletClient) {
              const amount = Math.round(amountToSend)
              Logger.info(
                {
                  wallet_id: account.balance_id,
                  wallet_request: {
                    amount,
                    amountToSend,
                    requestId: createId({
                      settlement: settlement._id.toString(),
                      source: taskName
                    })
                  }
                },
                'sending-to-wallet'
              )

              return walletClient.putMoneyIntoWallet(account.balance_id, {
                amount,
                requestId: createId({
                  settlement: settlement._id.toString(),
                  source: taskName + version
                })
              })
            }
          }

          function respond() {
            Logger.info({ wallet_id: account.balance_id }, 'send-money-success')

            return [
              settlement.settled_amount + amountToSend,
              account.balance_id
            ]
          }
        }

        async function updateSettlement(amount, walletId) {
          Logger.info(
            {
              amount,
              wallet_id: walletId,
              settlement_id: settlement._id.toString()
            },
            'updating-settlement-to-settled'
          )

          const updateData = {
            settled_amount: amount,
            wallet_id: walletId,
            status: 'settled',
            updated_at: moment().toDate()
          }

          await Settlement.updateOne(
            { _id: settlement._id },
            { $set: updateData }
          ).exec()

          return sendToAccountingQueue(settlement._id)
        }

        function settlementError(err) {
          Logger.error(
            { err, settlement_id: settlement._id },
            'settlement-error'
          )
        }
      }
    }

    function messageLog() {
      Logger.info('Settlements were successfully liquidated')
    }

    return SettlementsPromise
  }
}

async function triggerWebhook() {
  try {
    await publishMessage('SendSettlementsWebhook')
  } catch (err) {
    Logger.error(
      { settlement_date: moment().format('YYYY-MM-DD') },
      'error-publishing-settlements-webhook'
    )
    throw err
  }
}

async function sendToAccountingQueue(settlement_id) {
  const body = { settlement_id }

  Logger.info({ body }, 'sending-to-accounting-events-queue')
  try {
    await publishMessage(
      'AccountingEventsNewSettlement',
      Buffer.from(JSON.stringify(body))
    )

    Logger.info({ body }, 'sent-to-accounting-events-queue')
  } catch (err) {
    Logger.warn({ err, body }, 'failed-to-enqueue-for-accounting-events')
  }
}
