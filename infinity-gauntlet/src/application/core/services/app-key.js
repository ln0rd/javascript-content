import R from 'ramda'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import uniqueId from 'application/core/helpers/unique-id'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import RequiredParameterError from 'framework/core/errors/required-parameter-error'

export default class AppKeyService {
  static getAppKeys(locale, companyId) {
    return Promise.resolve()
      .then(findCompany)
      .tap(checkCompany)
      .then(respond)

    function findCompany() {
      return Company.findOne({ _id: companyId })
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

    function respond(response) {
      return R.map(key => {
        return {
          id: key._id,
          name: key.name
        }
      }, response.app_keys)
    }
  }

  static createAppKey(locale, params, companyId) {
    return Promise.resolve()
      .then(validate)
      .then(findCompany)
      .tap(checkCompany)
      .then(createAppKeys)
      .then(respond)

    function validate() {
      if (!R.has('name', params) || R.isEmpty(params.name)) {
        throw new RequiredParameterError(locale, 'name')
      }
    }

    function findCompany() {
      return Company.findOne({ _id: companyId })
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

    function createAppKeys(company) {
      company.app_keys.push({
        name: params.name,
        app_key: `apk_${uniqueId()}`
      })

      return company.save()
    }

    function respond(response) {
      const Result = R.last(response.app_keys)

      return {
        id: Result._id,
        name: Result.name,
        app_name: Result.app_key
      }
    }
  }

  static revokeAppKey(locale, params, companyId) {
    return Promise.resolve()
      .then(validate)
      .then(findCompany)
      .tap(checkCompany)
      .then(revokeAppKeys)
      .then(respond)

    function validate() {
      if (!R.has('id', params) || R.isEmpty(params.id)) {
        throw new RequiredParameterError(locale, 'id')
      }
    }

    function findCompany() {
      return Company.findOne({ _id: companyId })
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

    function revokeAppKeys(company) {
      if (
        !R.find(v => {
          return v._id.toString() === params.id
        }, company.app_keys)
      ) {
        throw new ModelNotFoundError(
          locale,
          translate('models.app_key', locale)
        )
      }

      company.app_keys.id(params.id).remove()

      return company.save()
    }

    function respond() {
      return {
        message: translate('services.app_key.message', locale)
      }
    }
  }
}
