import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import { flattenObj } from 'application/core/helpers/utils'
import { validate } from 'framework/core/adapters/validator'
import Affiliation from 'application/core/models/affiliation'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ChargeConfiguration from 'application/core/models/charge-configuration'
import { chargeConfigurationResponder } from 'application/core/responders/charge-configuration'
import InvalidInitialChargeDateError from 'application/core/errors/invalid-initial-charge-date-error'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'

export default class ChargeConfigurationService {
  static getChargeConfigurations(locale, params, companyId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(get)
      .then(respond)

    function formatQuery() {
      const Query = {
        company_id: companyId
      }

      if (params.start_date || params.end_date) {
        Query.created_at = {}

        if (params.start_date) {
          Query.created_at.$gte = moment(params.start_date)
            .startOf('day')
            .toDate()
        }

        if (params.end_date) {
          Query.created_at.$lte = moment(params.end_date)
            .endOf('day')
            .toDate()
        }
      }

      return R.merge(
        Query,
        R.pick(
          [
            'charge_method',
            'interval',
            'status',
            'provider',
            'destination_company_id',
            '_id'
          ],
          R.reject(v => {
            if (R.isNil(v)) {
              return true
            }
            if (R.isEmpty(v)) {
              return true
            }
          }, params)
        )
      )
    }

    function get(query) {
      return paginate(
        locale,
        ChargeConfiguration,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        chargeConfigurationResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getChargeConfiguration(locale, chargeConfigId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkChargeConfiguration)
      .then(respond)

    function checkParams() {
      const Errors = validate(
        'request_charge_configuration_get_charge_configuration',
        {
          id: chargeConfigId
        }
      )

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return ChargeConfiguration.findOne({
        _id: chargeConfigId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChargeConfiguration(chargeConfiguration) {
      if (!chargeConfiguration) {
        throw new ModelNotFoundError(
          locale,
          translate('models.charge_configuration', locale)
        )
      }
    }

    function respond(chargeConfiguration) {
      return chargeConfigurationResponder(chargeConfiguration)
    }
  }

  static getChildrenChargeConfigurations(locale, params, companyId) {
    return Promise.resolve()
      .then(formatCompanyQuery)
      .then(findCompanies)
      .then(findChargeConfigurations)

    function formatCompanyQuery() {
      let RawCompanyQuery = params.company_query || {}

      if (!R.is(Object, RawCompanyQuery)) {
        try {
          RawCompanyQuery = JSON.parse(RawCompanyQuery)
        } catch (e) {
          RawCompanyQuery = {}
        }
      }

      const CompanyQuery = flattenObj(RawCompanyQuery)

      CompanyQuery.parent_id = companyId

      // Adicionamos esse if na data (26/11/2021) devido a problemas de black friday que pegamos do ISO, Neon.
      // Ainda é uma solução paliativa por conta que caso não venha esse parâmetro o endpoint continua lento.
      if (params.company_id) {
        CompanyQuery.id_str = params.company_id
      }

      return CompanyQuery
    }

    function findCompanies(query) {
      return Company.find(query)
        .lean()
        .exec()
    }

    function findChargeConfigurations(companies) {
      let query = {}
      if (params.start_date || params.end_date) {
        query.created_at = {}

        if (params.start_date) {
          query.created_at.$gte = moment(params.start_date)
            .startOf('day')
            .toDate()
        }

        if (params.end_date) {
          query.created_at.$lte = moment(params.end_date)
            .endOf('day')
            .toDate()
        }
      }

      query = R.merge(
        query,
        R.pick(
          [
            'charge_method',
            'interval',
            'status',
            'provider',
            'destination_company_id',
            '_id'
          ],
          R.reject(v => {
            if (R.isNil(v)) {
              return true
            }
            if (R.isEmpty(v)) {
              return true
            }
          }, params)
        )
      )

      let companiesArray = R.map(c => c._id.toString(), companies)

      return Promise.resolve()
        .then(checkLevel)
        .tap(concatCompanies)
        .then(formatChargeConfigurationsQuery)
        .then(find)
        .then(respond)

      function checkLevel() {
        if (Number(params.max_level) === 2) {
          return Company.find({
            parent_id: { $in: companiesArray }
          })
            .lean()
            .exec()
        }
      }

      function concatCompanies(childrenCompanies) {
        if (!childrenCompanies) {
          return
        }

        companiesArray = R.concat(
          companiesArray,
          R.map(c => c._id.toString(), childrenCompanies)
        )

        companies = R.concat(companies, childrenCompanies)
      }

      function formatChargeConfigurationsQuery() {
        if (params.company_id) {
          if (R.contains(params.company_id, companiesArray)) {
            query.company_id = params.company_id
          } else {
            throw new CompanyNotBelongToParentError(locale)
          }
        } else {
          query.company_id = { $in: companiesArray }
        }
      }

      function find() {
        function responder(response) {
          return Promise.resolve()
            .then(populateFields)
            .then(format)

          function populateFields() {
            return R.map(t => {
              const CurrentCompany =
                R.find(c => {
                  return c._id.toString() === t.company_id.toString()
                }, companies) || {}

              t.company_name = CurrentCompany.name
              t.company_parent_id = CurrentCompany.parent_id
              t.company_full_name = CurrentCompany.full_name
              t.company_document_number = CurrentCompany.document_number
              t.company_document_type = CurrentCompany.document_type
              t.company_metadata = CurrentCompany.company_metadata
              t.company_created_at = CurrentCompany.created_at

              return t
            }, response)
          }

          function format(model) {
            return chargeConfigurationResponder(model)
          }
        }

        return paginate(
          locale,
          ChargeConfiguration,
          query,
          {
            created_at: 'desc'
          },
          params.page,
          params.count,
          responder
        )
      }

      function respond(response) {
        return response
      }
    }
  }

  static cancelChild(locale, chargeConfigId, childId, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getChargeConfiguration)
      .tap(checkChargeConfiguration)
      .then(cancelChargeConfiguration)
      .then(respond)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function getChargeConfiguration(childCompany) {
      return ChargeConfiguration.findOne({
        _id: chargeConfigId,
        company_id: childCompany._id
      })
    }

    function checkChargeConfiguration(chargeConfiguration) {
      if (!chargeConfiguration) {
        throw new ModelNotFoundError(
          locale,
          translate('models.charge_configuration', locale)
        )
      }
    }

    function cancelChargeConfiguration(chargeConfiguration) {
      chargeConfiguration.status = 'canceled'

      return chargeConfiguration.save()
    }

    function respond(chargeConfiguration) {
      return chargeConfigurationResponder(chargeConfiguration)
    }
  }

  static createChild(locale, params, childId, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getParentCompany)
      .spread(setParams)
      .tap(checkParams)
      .then(getAffiliations)
      .then(createChargeConfiguration)
      .then(respond)

    function getChildCompany() {
      return Company.findOne({
        _id: childId,
        parent_id: companyId
      })
        .lean()
        .exec()
    }

    function checkChildCompany(childCompany) {
      if (!childCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function getParentCompany(childCompany) {
      return [
        childCompany,
        Company.findOne({
          _id: companyId
        })
          .lean()
          .exec()
      ]
    }

    function setParams(childCompany, parentCompany) {
      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', parentCompany)
      ) {
        params.provider = parentCompany.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'hash'
      }

      if (!R.has('charge_method', params)) {
        params.charge_method = 'balance_debit'
      }

      if (!R.has('interval', params)) {
        params.interval = 'monthly'
      }

      params.status = 'active'
      params.executed_charges = 0
      params.company_id = childId

      params.destination_company_id = companyId

      return params
    }

    function checkParams() {
      const InitialDate = moment(params.initial_charge_date)

      if (!InitialDate.isValid()) {
        throw new InvalidInitialChargeDateError(locale)
      }

      if (
        moment().diff(InitialDate, 'days') > 0 ||
        moment().isSame(InitialDate, 'day')
      ) {
        throw new InvalidInitialChargeDateError(locale)
      }

      params.initial_charge_date = moment(params.initial_charge_date).format(
        'YYYY-MM-DD'
      )
      params.next_charge_date = params.initial_charge_date

      const Errors = validate('charge_configuration', params, {
        checkRequired: true
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getAffiliations() {
      return Promise.resolve()
        .then(getDestinationAffiliation)
        .tap(checkDestinationAffiliation)
        .then(getOriginAffiliation)
        .tap(checkOriginAffiliation)

      function getDestinationAffiliation() {
        return Affiliation.findOne({
          company_id: params.destination_company_id,
          enabled: true,
          status: 'active',
          provider: params.provider
        })
          .lean()
          .exec()
      }

      function checkDestinationAffiliation(destinationAffiliation) {
        if (!destinationAffiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }
      }

      function getOriginAffiliation() {
        return Affiliation.findOne({
          company_id: params.company_id,
          enabled: true,
          status: 'active',
          provider: params.provider
        })
          .lean()
          .exec()
      }

      function checkOriginAffiliation(originAffiliation) {
        if (!originAffiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }
      }
    }

    function createChargeConfiguration() {
      return ChargeConfiguration.create(params)
    }

    function respond(chargeConfiguration) {
      return chargeConfigurationResponder(chargeConfiguration)
    }
  }
}
