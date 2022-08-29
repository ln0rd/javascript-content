import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import Charge from 'application/core/models/charge'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import Connector from 'application/core/providers/connector'
import Affiliation from 'application/core/models/affiliation'
import { paginate } from 'application/core/helpers/pagination'
import { chargeResponder } from 'application/core/responders/charge'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import InvalidChargeDateError from 'application/core/errors/invalid-charge-date-error'
import ChargeAlreadyProcessedError from 'application/core/errors/charge-already-processed-error'
import ProcessChargeOnProviderError from 'application/core/errors/process-charge-on-provider-error'
import InvalidChargeAmountTypeError from 'application/core/errors/invalid-charge-amount-type-error'
import { createMatchFilters } from '../helpers/filter'
import { pick } from '../helpers/utils'

const Logger = createLogger({
  name: 'CHARGE_SERVICE'
})

export default class ChargeService {
  static getSelectDefault() {
    return [
      'status',
      'amount',
      'provider',
      'description',
      'charge_method',
      'charge_configuration_id',
      'charge_date',
      'original_charge_date',
      'created_at',
      'updated_at',
      'company_id',
      'destination_company_id',
      'payment_history',
      'paid_amount',
      '_company_partial',
      'iso_id'
    ].join(' ')
  }

  static getCharges(locale, params, companyId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(get)
      .then(respond)

    function formatQuery() {
      const Query = {
        company_id: companyId
      }

      if (params.start_date || params.end_date) {
        Query.charge_date = {}

        if (params.start_date) {
          Query.charge_date.$gte = moment(params.start_date).format(
            'YYYY-MM-DD'
          )
        }

        if (params.end_date) {
          Query.charge_date.$lt = moment(params.end_date)
            .add(1, 'd')
            .format('YYYY-MM-DD')
        }
      }

      if (params.status) {
        Query.status = {
          $in: params.status.split(',')
        }
      }

      return R.merge(
        Query,
        R.pick(
          [
            'charge_method',
            'provider',
            'charge_date',
            'destination_company_id',
            'charge_configuration_id'
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
        Charge,
        query,
        {
          charge_date: 'desc'
        },
        params.page,
        params.count,
        chargeResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getCharge(locale, chargeId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkCharge)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_charge_get_charge', {
        id: chargeId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return Charge.findOne({
        _id: chargeId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkCharge(charge) {
      if (!charge) {
        throw new ModelNotFoundError(locale, translate('models.charge', locale))
      }
    }

    function respond(charge) {
      return chargeResponder(charge)
    }
  }

  static getChildrenCharges(locale, params, isoId) {
    let query = {
      iso_id: isoId
    }

    if (params.start_date || params.end_date) {
      query.charge_date = {}

      if (params.start_date) {
        query.charge_date.$gte = moment(params.start_date).format('YYYY-MM-DD')
      }

      if (params.end_date) {
        query.charge_date.$lt = moment(params.end_date)
          .add(1, 'd')
          .format('YYYY-MM-DD')
      }
    }

    if (params.status) {
      query.status = {
        $in: params.status.split(',')
      }
    }

    const filterAttributes = [
      'company_id',
      'charge_method',
      'provider',
      'charge_date',
      'destination_company_id',
      'charge_configuration_id'
    ]
    const filterParams = pick(filterAttributes, params)
    const filters = createMatchFilters(filterParams)
    query = Object.assign(query, filters)

    const select = params.fields
      ? params.fields.split(',').join(' ')
      : this.getSelectDefault()

    let sort = {
      charge_date: 'desc'
    }

    if (params.sort) {
      try {
        sort = JSON.parse(params.sort)
      } catch (err) {
        Logger.warn(
          { err, operation: 'getChildrenCharges', params },
          `getChildrenCharges: JSON.parse sort param failed`
        )
      }
    }

    return paginate(
      locale,
      Charge,
      query,
      sort,
      params.page,
      params.count,
      chargeResponder,
      select
    )
  }

  static cancelChild(locale, chargeId, childId, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getCharge)
      .tap(checkCharge)
      .then(cancelCharge)
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

    function getCharge(childCompany) {
      return Charge.findOne({
        _id: chargeId,
        company_id: childCompany._id
      })
    }

    function checkCharge(charge) {
      if (!charge) {
        throw new ModelNotFoundError(locale, translate('models.charge', locale))
      }

      if (charge.status !== 'pending_payment' || charge.processed) {
        throw new ChargeAlreadyProcessedError(locale)
      }
    }

    function cancelCharge(charge) {
      charge.status = 'canceled'

      return charge.save()
    }

    function respond(charge) {
      return chargeResponder(charge)
    }
  }

  static createChild(locale, params, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getDestinationCompany)
      .spread(setParams)
      .tap(checkParams)
      .then(getAffiliations)
      .then(executeCharge)
      .tap(checkChargeExecution)
      .then(saveCharge)
      .then(respond)

    function getChildCompany() {
      return Company.findOne({
        _id: params.company_id,
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

    function getDestinationCompany(childCompany) {
      if (params.destination_company_id === companyId) {
        return [
          childCompany,
          Company.findOne({
            _id: companyId
          })
            .lean()
            .exec()
        ]
      }

      return [
        childCompany,
        Company.findOne({
          _id: params.destination_company_id,
          parent_id: companyId
        })
          .lean()
          .exec()
      ]
    }

    function setParams(childCompany, parentCompany) {
      if (!parentCompany) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }

      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', parentCompany)
      ) {
        params.provider = parentCompany.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'stone'
      }

      if (!R.has('charge_method', params)) {
        params.charge_method = 'balance_debit'
      }

      params.status = 'pending_payment'
      params.iso_id = childCompany.parent_id
      params._company_partial = {
        name: childCompany.name,
        full_name: childCompany.full_name,
        document_number: childCompany.document_number,
        document_type: childCompany.document_type,
        company_metadata: childCompany.company_metadata,
        created_at: childCompany.created_at
      }

      return params
    }

    function checkParams() {
      const Errors = validate('charge', params, {
        checkRequired: true
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      const InitialDate = moment(params.charge_date)

      if (!InitialDate.isValid()) {
        throw new InvalidChargeDateError(locale)
      }

      if (
        moment().diff(InitialDate, 'days') > 0 ||
        moment().isSame(InitialDate, 'day')
      ) {
        throw new InvalidChargeDateError(locale)
      }

      if (!Number.isInteger(params.amount)) {
        throw new InvalidChargeAmountTypeError(locale)
      }

      params.charge_date = moment(params.charge_date).format('YYYY-MM-DD')
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

        params.destination_affiliation_id = destinationAffiliation._id
        params.destination_affiliation = destinationAffiliation
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

        params.affiliation_id = originAffiliation._id
        params.from_affiliation = originAffiliation
      }
    }

    function executeCharge() {
      const Provider = Connector(locale, params.provider)
      const From = params.from_affiliation
      const To = params.destination_affiliation
      const Amount = params.amount
      const Date = params.charge_date
      const Extra = params.company_id

      return Provider.createCharge(From, To, Amount, Date, Extra)
    }

    function checkChargeExecution(chargeResult) {
      if (chargeResult.status !== 'success') {
        throw new ProcessChargeOnProviderError(locale)
      }

      if (R.has('processed', chargeResult)) {
        params.processed = chargeResult.processed
      } else {
        params.processed = false
      }

      if (R.has('provider_model', chargeResult)) {
        params.provider_model = chargeResult.provider_model
      }

      if (R.has('provider_model_id', chargeResult)) {
        params.provider_model_id = chargeResult.provider_model_id
      }
    }

    function saveCharge() {
      return Charge.create(params)
    }

    function respond(charge) {
      return chargeResponder(charge)
    }
  }
}
