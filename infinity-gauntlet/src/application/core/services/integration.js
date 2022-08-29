import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import Bridge from 'application/core/integrations/bridge'
import { flattenObj } from 'application/core/helpers/utils'
import { validate } from 'framework/core/adapters/validator'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import IntegrationRequest from 'application/core/models/integration-request'
import IntegrationCredential from 'application/core/models/integration-credential'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { integrationRequestResponder } from 'application/core/responders/integration-request'
import { integrationCredentialResponder } from 'application/core/responders/integration-credential'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'

export default class IntegrationService {
  static getChildrenIntegrationRequests(locale, params, companyId) {
    return Promise.resolve()
      .then(formatCompanyQuery)
      .then(findCompanies)
      .then(findIntegrationRequests)

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

      return CompanyQuery
    }

    function findCompanies(query) {
      return Company.find(query)
        .lean()
        .exec()
    }

    function findIntegrationRequests(companies) {
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
          ['status', 'name'],
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
        .then(formatIntegrationRequestsQuery)
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

      function formatIntegrationRequestsQuery() {
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
            return integrationRequestResponder(model)
          }
        }

        return paginate(
          locale,
          IntegrationRequest,
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

  static updateChildCredential(
    locale,
    companyId,
    parentId,
    integrationId,
    params
  ) {
    return Promise.resolve()
      .then(getCompany)
      .tap(validateCompany)
      .then(updateCredential)
      .then(respond)

    function getCompany() {
      return Company.findOne({ _id: companyId, parent_id: parentId })
        .lean()
        .exec()
    }

    function validateCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function updateCredential() {
      let newData = R.pick(['key', 'username', 'password'], params)
      return IntegrationCredential.findOneAndUpdate(
        {
          _id: integrationId,
          company_id: companyId
        },
        newData,
        { new: true }
      )
        .lean()
        .exec()
    }

    function respond(updatedCredential) {
      return integrationCredentialResponder(updatedCredential)
    }
  }

  static getChildrenIntegrationCredentials(locale, params, parentId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(getCompanies)
      .then(getIntegrationCredentials)
      .then(respond)

    function formatQuery() {
      let query = params.company_id ? { _id: params.company_id } : {}
      query.parent_id = parentId

      return query
    }

    function getCompanies(query) {
      return Company.find(query)
        .select('_id')
        .lean()
        .exec()
    }

    function getIntegrationCredentials(companies) {
      return IntegrationCredential.find({
        company_id: { $in: R.map(company => company._id.toString(), companies) }
      })
        .lean()
        .exec()
    }

    function respond(credentials) {
      return integrationCredentialResponder(credentials)
    }
  }

  static createCredential(locale, params, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .tap(applyDefaults)
      .then(create)
      .then(respond)

    function checkParams() {
      const Errors = validate('integration_credential', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function applyDefaults() {
      params.company_id = companyId
    }

    function create() {
      return IntegrationCredential.create(params)
    }

    function respond(response) {
      return integrationCredentialResponder(response)
    }
  }

  static deleteChildCredential(locale, companyId, parentId, integrationId) {
    return Promise.resolve()
      .then(getCompany)
      .tap(validateCompany)
      .then(deleteCredential)
      .then(respond)

    function getCompany() {
      return Company.findOne({ _id: companyId, parent_id: parentId })
        .lean()
        .exec()
    }

    function validateCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function deleteCredential() {
      return IntegrationCredential.deleteOne({
        _id: integrationId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function respond() {
      return {
        success: true
      }
    }
  }

  static createChildCredential(locale, params, parentId, companyId) {
    return Promise.bind(this)
      .then(getCompany)
      .tap(checkCompany)
      .then(createChildCredential)
      .then(respond)

    function getCompany() {
      return Company.findOne({ parent_id: parentId, _id: companyId })
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

    function createChildCredential() {
      return this.createCredential(locale, params, companyId)
    }

    function respond(credential) {
      return integrationCredentialResponder(credential)
    }
  }

  static processRequest(locale, params, companyId) {
    return Promise.resolve()
      .tap(applyDefaults)
      .tap(checkParams)
      .then(getCompany)
      .tap(checkCompany)
      .then(find)
      .spread(findOnParent)
      .tap(checkIntegrationCredential)
      .then(process)
      .then(createRequest)
      .then(respond)

    function applyDefaults() {
      if (
        !R.has('model_id', params) &&
        R.has('data', params) &&
        R.has('document_number', params.data)
      ) {
        params.model_id = params.data.document_number
      }
    }

    function checkParams() {
      const Errors = validate('integration_request', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

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

    function find(company) {
      return [
        company,
        IntegrationCredential.findOne({
          company_id: company._id,
          name: params.integration
        })
          .lean()
          .exec()
      ]
    }

    function findOnParent(company, integrationCredential) {
      if (integrationCredential) {
        return integrationCredential
      }

      if (!integrationCredential && !R.has('parent_id', company)) {
        throw new ModelNotFoundError(
          locale,
          translate('models.integration_credential', locale)
        )
      }

      return IntegrationCredential.findOne({
        company_id: company.parent_id,
        name: params.integration
      })
        .lean()
        .exec()
    }

    function checkIntegrationCredential(integrationCredential) {
      if (!integrationCredential) {
        throw new ModelNotFoundError(
          locale,
          translate('models.integration_credential', locale)
        )
      }
    }

    function process(integrationCredential) {
      return Bridge(
        locale,
        params.integration,
        integrationCredential,
        params.data
      )
    }

    function createRequest(result) {
      result.model = params.model
      result.model_id = params.model_id
      result.name = params.integration
      result.company_id = companyId

      result.request_body = JSON.stringify(result.request_body)

      return IntegrationRequest.create(result)
    }

    function respond(response) {
      return integrationRequestResponder(response)
    }
  }
}
