import Promise from 'bluebird'
import moment from 'moment-timezone'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import Charge from 'application/core/models/charge'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import Affiliation from 'application/core/models/affiliation'
import { getNextBusinessDay } from 'application/core/helpers/date'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ChargeConfiguration from 'application/core/models/charge-configuration'
import HashlabChargeConfigTaskError from 'application/core/errors/hashlab-charge-config-task-error'

const Logger = createLogger({ name: 'HASHLAB_CHARGE_CONFIG_TASK' })

export default class HashLabChargeConfig {
  static type() {
    return 'periodic'
  }

  static expression() {
    return '0 */10 * * * *'
  }

  static handler() {
    const ChargeDate = moment()
      .tz(config.timezone)
      .add(1, 'd')
      .format('YYYY-MM-DD')
    const FinalChargeDate = moment()
      .tz(config.timezone)
      .add(30, 'd')
      .format('YYYY-MM-DD')

    const ChargeConfigurationPromise = Promise.resolve()
      .then(findChargeConfigurations)
      .tap(checkChargeConfigurations)
      .each(findAffiliationsAndCreateCharge)
      .catch(errorHandler)

    function findChargeConfigurations() {
      return ChargeConfiguration.find({
        next_charge_date: {
          $gte: ChargeDate,
          $lte: FinalChargeDate
        },
        status: 'active',
        provider: { $in: ['hash', 'stone'] },
        charge_method: 'balance_debit'
      })
        .sort({ created_at: 'asc' })
        .exec()
    }

    function checkChargeConfigurations(chargeConfigs) {
      if (chargeConfigs.length === 0) {
        Logger.info('No charges configurations pending charge creation')

        return ChargeConfigurationPromise.cancel()
      }

      Logger.info(`${chargeConfigs.length} charge configurations found.`)
    }

    function findAffiliationsAndCreateCharge(chargeConfig) {
      return Promise.resolve()
        .then(findOriginAffiliation)
        .tap(checkOriginAffiliation)
        .then(findDestinationAffiliation)
        .spread(checkChargeConfigAndCreateCharge)
        .catch(chargeConfigErrorHandler)

      function findOriginAffiliation() {
        return Affiliation.findOne({
          company_id: chargeConfig.company_id,
          enabled: true,
          status: 'active',
          provider: chargeConfig.provider
        })
      }

      function checkOriginAffiliation(originAffiliation) {
        if (!originAffiliation) {
          Logger.info(
            `Origin affiliation for chargeConfig ${chargeConfig._id} not found.`
          )

          throw new ModelNotFoundError(
            frameworkConfig.core.i18n.defaultLocale,
            translate(
              'models.affiliation',
              frameworkConfig.core.i18n.defaultLocale
            )
          )
        }

        Logger.info(
          `Origin affiliation for chargeConfig ${chargeConfig._id} found.`
        )
      }

      function findDestinationAffiliation(originAffiliation) {
        return [
          originAffiliation,
          Affiliation.findOne({
            company_id: chargeConfig.destination_company_id,
            enabled: true,
            status: 'active',
            provider: chargeConfig.provider
          })
        ]
      }

      async function checkChargeConfigAndCreateCharge(
        originAffiliation,
        destinationAffiliation
      ) {
        if (!destinationAffiliation) {
          Logger.info(
            `Destination affiliation for chargeConfig ${
              chargeConfig._id
            } not found.`
          )

          throw new ModelNotFoundError(
            frameworkConfig.core.i18n.defaultLocale,
            translate(
              'models.affiliation',
              frameworkConfig.core.i18n.defaultLocale
            )
          )
        }

        Logger.info(
          `Destination affiliation for chargeConfig ${chargeConfig._id} found.`
        )

        if (
          chargeConfig.charges &&
          chargeConfig.executed_charges >= chargeConfig.charges
        ) {
          chargeConfig.status = 'finished'

          Logger.info(`ChargeConfig ${chargeConfig._id} already finished.`)

          return chargeConfig.save()
        }

        const merchant = await Company.findOne({
          _id: chargeConfig.company_id
        }).select(
          'name full_name document_number document_type company_metadata created_at parent_id'
        )

        const ChargeData = {
          provider: chargeConfig.provider,
          affiliation_id: originAffiliation._id,
          destination_affiliation_id: destinationAffiliation._id,
          charge_configuration_id: chargeConfig._id,
          amount: chargeConfig.amount,
          status: 'pending_payment',
          original_charge_date: chargeConfig.next_charge_date,
          charge_method: chargeConfig.charge_method,
          processed: false,
          company_id: chargeConfig.company_id,
          destination_company_id: chargeConfig.destination_company_id,
          iso_id: merchant.parent_id,
          _company_partial: {
            name: merchant.name,
            full_name: merchant.full_name,
            document_number: merchant.document_number,
            document_type: merchant.document_type,
            company_metadata: merchant.company_metadata,
            created_at: merchant.created_at
          }
        }

        const OriginalDate = moment(ChargeData.original_charge_date)

        if (chargeConfig.description) {
          ChargeData.description = `${
            chargeConfig.description
          } - ${OriginalDate.format('MM/YY')}`
        }

        if (chargeConfig.model && chargeConfig.model_id) {
          ChargeData.model = chargeConfig.model
          ChargeData.model_id = chargeConfig.model_id
        }

        return Promise.resolve()
          .then(getChargeDate)
          .then(createCharge)
          .then(updateChargeConfig)
          .then(logSuccess)

        function getChargeDate() {
          return getNextBusinessDay(OriginalDate)
        }

        function createCharge(date) {
          ChargeData.charge_date = date.format('YYYY-MM-DD')

          Logger.info(`Creating charge for chargeConfig ${chargeConfig._id}.`)

          return Charge.create(ChargeData)
        }

        function updateChargeConfig() {
          chargeConfig.executed_charges += 1

          if (
            chargeConfig.charges &&
            chargeConfig.executed_charges >= chargeConfig.charges
          ) {
            chargeConfig.status = 'finished'

            Logger.info(`ChargeConfig ${chargeConfig._id} finished now.`)
          }

          if (chargeConfig.status === 'active') {
            let nextCharge = moment(chargeConfig.initial_charge_date)
            const Quantity = chargeConfig.executed_charges
            let operator = ''

            if (chargeConfig.interval === 'annually') {
              operator = 'y'
            } else if (chargeConfig.interval === 'weekly') {
              operator = 'w'
            } else {
              operator = 'M'
            }

            nextCharge = nextCharge.add(Quantity, operator).format('YYYY-MM-DD')

            chargeConfig.next_charge_date = nextCharge
          }

          Logger.info(
            `Updating chargeConfig ${chargeConfig._id} after create charge.`
          )

          return chargeConfig.save()
        }

        function logSuccess() {
          Logger.info(
            `Charge for chargeConfig ${chargeConfig._id} created successfully.`
          )
        }
      }

      function chargeConfigErrorHandler(err) {
        Logger.error(
          `An error has occurred on the charge config error handler: ${
            err.message
          }`
        )
      }
    }

    function errorHandler(err) {
      throw new HashlabChargeConfigTaskError(
        frameworkConfig.core.i18n.defaultLocale,
        err
      )
    }

    return ChargeConfigurationPromise
  }
}
