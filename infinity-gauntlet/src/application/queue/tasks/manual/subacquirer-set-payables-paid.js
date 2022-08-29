import moment from 'moment'
import Promise from 'bluebird'
import frameworkConfig from 'framework/core/config'
import Payable from 'application/core/models/payable'
import Provider from 'application/core/models/provider'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import Settlement from 'application/core/models/settlement'
import Affiliation from 'application/core/models/affiliation'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import SettlementDomain from 'modules/financial-calendar/domain/settlement'

const Logger = createLogger({ name: 'SUBACQUIRER_SET_PAYABLES_PAID' })

export default class SubacquirerSetPayablesPaid {
  static type() {
    return 'manual'
  }

  static handler(args) {
    let date = args[0]

    if (!date) {
      date = moment().format('YYYY-MM-DD')
    } else {
      date = moment(date).format('YYYY-MM-DD')
    }

    Logger.info(`Starting payable settlement for date: ${date}`)

    const ProvidersPromise = Promise.resolve()
      .then(findProviders)
      .tap(checkProviders)
      .each(setPayablesPaid)
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

        return ProvidersPromise.cancel()
      }

      Logger.info(`${providers.length} providers found.`)
    }

    function setPayablesPaid(provider) {
      Logger.info(`Start paying payables for provider ${provider.name}`)

      return Promise.resolve()
        .then(findPayablesByCompany)
        .tap(checkPayables)
        .each(updateSettlementAndPayables)
        .then(finishProvider)

      function findPayablesByCompany() {
        const PayableQuery = [
          {
            $match: {
              status: 'waiting_funds',
              payment_date: {
                $lte: date
              },
              provider: provider.name
            }
          },
          {
            $group: {
              _id: '$affiliation_id',
              payables: {
                $push: {
                  amount: '$amount',
                  fee: '$fee',
                  cost: '$cost',
                  cip_escrowed_amount: '$cip_escrowed_amount',
                  _id: '$_id',
                  company_id: '$company_id',
                  card_brand: '$card_brand',
                  payment_method: '$payment_method',
                  original_payment_date: '$original_payment_date',
                  total_installments: '$total_installments'
                }
              }
            }
          }
        ]

        return Payable.aggregate(PayableQuery).allowDiskUse(true)
      }

      function checkPayables(payablesByAffiliation) {
        Logger.info(
          `${payablesByAffiliation.length} affiliations with payables found`
        )
      }

      function updateSettlementAndPayables(affiliationPayables) {
        Logger.info(`Paying affiliation ${affiliationPayables._id}`)

        return Promise.resolve()
          .then(findAffiliation)
          .tap(checkAffiliation)
          .then(findOrCreateSettlement)
          .then(updateSettlement)
          .then(updatePayables)
          .catch(affiliationErrorHandler)

        function findAffiliation() {
          Logger.info('Getting affiliation...')
          return Affiliation.findOne({
            _id: affiliationPayables._id
          })
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

        function findOrCreateSettlement(affiliation) {
          return Promise.resolve()
            .then(findSettlement)
            .then(respondOrCreateSettlement)

          function findSettlement() {
            Logger.info('Finding settlement...')

            return Settlement.findOne({
              date: date,
              provider: provider.name,
              company_id: affiliation.company_id
            })
          }

          function respondOrCreateSettlement(settlement) {
            if (settlement) {
              Logger.info('Settlement found, lets start our work, ma friend')

              settlement.status = 'processing'

              return settlement
            }

            Logger.info('Settlement not found, lets create this babe')

            const BaseSettlement = {
              settlement_type: 'wallet',
              provider: provider.name,
              status: 'processing',
              date: date,
              amount: 0,
              settled_amount: 0,
              last_negative_amount: 0,
              brands: [],
              charges: [],
              boleto: {
                payables: [],
                amount: 0
              },
              received_charges: [],
              affiliations: [affiliation._id],
              company_id: affiliation.company_id,
              cip_escrowed_amount: 0
            }

            return Settlement.create(BaseSettlement)
          }
        }

        function updateSettlement(settlement) {
          return Promise.resolve()
            .then(() =>
              SettlementDomain.calculateSettlement(
                settlement,
                affiliationPayables
              )
            )
            .then(updateSettlement)

          function updateSettlement(updatedSettlement) {
            return updatedSettlement.save()
          }
        }

        async function updatePayables(settlement) {
          const payablesIds = affiliationPayables.payables.map(({ _id }) => _id)
          Logger.info(
            {
              affiliation_id: affiliationPayables._id,
              total_payables: payablesIds,
              settlement_id: settlement._id
            },
            'updating_payables'
          )
          try {
            const updateWriteOpResult = await Payable.updateMany(
              { _id: { $in: payablesIds } },
              {
                $set: {
                  status: 'paid',
                  payment_date: date,
                  settlement_id: settlement._id
                }
              }
            )
            Logger.info(
              {
                result: updateWriteOpResult,
                affiliation_id: affiliationPayables._id,
                total_payables: payablesIds,
                settlement_id: settlement._id
              },
              'Payables-updated-successfully'
            )
          } catch (err) {
            Logger.error(
              {
                err,
                affiliation_id: affiliationPayables._id,
                total_payables: payablesIds.length,
                settlement_id: settlement._id
              },
              'error-updating-payables'
            )
          }
        }

        function affiliationErrorHandler(err) {
          Logger.info(`Error paying affiliation ${affiliationPayables._id}`)
          Logger.info(err.message)
        }
      }

      function finishProvider() {
        Logger.info(
          `Paybles for provider ${provider.name} were successfully paid`
        )
      }
    }

    function messageLog() {
      Logger.info(
        'Paybles were successfully paid and settlement is ready to be settled'
      )
    }

    return ProvidersPromise
  }
}
