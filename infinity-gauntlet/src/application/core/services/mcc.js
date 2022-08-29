import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Mcc from 'application/core/models/mcc-pricing'
import RegisteredMcc from 'application/core/models/mcc'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import { paginate } from 'application/core/helpers/pagination'
import { mccResponder } from 'application/core/responders/mcc'
import { registeredMccResponder } from 'application/core/responders/registered-mcc'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import MccAlreadyExistsError from 'application/core/errors/mcc-already-exists-error'

export default class MccService {
  static getMccs(locale, params, companyId) {
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
          ['mcc', 'provider'],
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
        Mcc,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        mccResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static updateMcc(locale, params, id, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkMcc)
      .tap(checkParams)
      .then(update)
      .then(respond)

    function get() {
      return Mcc.findOne({
        _id: id,
        company_id: companyId
      })
    }

    function checkMcc(mcc) {
      if (!mcc) {
        throw new ModelNotFoundError(locale, translate('models.mcc', locale))
      }
    }

    function checkParams() {
      const Errors = validate('mcc', params, { checkRequired: false })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function update(mcc) {
      if (R.has('minimum_anticipation_fee', params)) {
        mcc.minimum_anticipation_fee = params.minimum_anticipation_fee
      }

      if (R.has('minimum_brands_fee', params)) {
        mcc.minimum_brands_fee = params.minimum_brands_fee
      }

      return mcc.save()
    }

    function respond(mcc) {
      return mccResponder(mcc)
    }
  }

  static create(locale, params, companyId) {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .tap(checkParams)
      .then(getMcc)
      .tap(checkMcc)
      .then(createMcc)
      .then(respond)

    function getCompany() {
      return Company.findOne({
        _id: companyId
      })
        .lean()
        .exec()
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function checkParams(company) {
      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', company)
      ) {
        params.provider = company.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'stone'
      }

      params.company_id = company._id

      const Errors = validate('mcc', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getMcc() {
      return Mcc.findOne({
        mcc: params.mcc,
        provider: params.provider,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkMcc(mcc) {
      if (mcc) {
        throw new MccAlreadyExistsError(locale)
      }
    }

    function createMcc() {
      return Mcc.create(params)
    }

    function respond(mcc) {
      return mccResponder(mcc)
    }
  }

  static getRegistered(locale, params) {
    return Promise.resolve()
      .then(getMccs)
      .then(respond)

    function getMccs() {
      const query = R.pick(
        ['mcc', 'cnae', 'enabled', 'description', '_id'],
        params
      )

      return RegisteredMcc.find(query)
        .lean()
        .exec()
    }

    function respond(response) {
      return registeredMccResponder(response)
    }
  }
}
