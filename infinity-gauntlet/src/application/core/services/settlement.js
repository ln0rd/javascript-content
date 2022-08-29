import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import Settlement from 'application/core/models/settlement'
import { validate } from 'framework/core/adapters/validator'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { settlementResponder } from 'application/core/responders/settlement'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import CompanyService from 'application/core/services/company'

export default class SettlementService {
  static getSettlements(locale, params, companyId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(get)
      .then(respond)

    function formatQuery() {
      const Query = {
        company_id: companyId
      }

      if (params.start_date || params.end_date) {
        Query.date = {}

        if (params.start_date) {
          Query.date.$gte = moment(params.start_date).format('YYYY-MM-DD')
        }

        if (params.end_date) {
          Query.date.$lt = moment(params.end_date)
            .add(1, 'd')
            .format('YYYY-MM-DD')
        }
      }

      return R.merge(
        Query,
        R.pick(
          ['status', 'date', 'settlement_type', 'provider'],
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
        Settlement,
        query,
        {
          date: 'desc'
        },
        params.page,
        params.count,
        settlementResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getSettlement(locale, settlementId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkSettlement)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_settlement_get_settlement', {
        id: settlementId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return Settlement.findOne({
        _id: settlementId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkSettlement(settlement) {
      if (!settlement) {
        throw new ModelNotFoundError(
          locale,
          translate('models.settlement', locale)
        )
      }
    }

    function respond(settlement) {
      return settlementResponder(settlement)
    }
  }

  static getChildrenSettlements(locale, params, companyId, userId) {
    return Promise.resolve()
      .then(findCompanies)
      .then(findSettlements)

    function findCompanies() {
      return CompanyService.getChildrenCompanies(
        locale,
        R.pick(['company_query'], params),
        companyId,
        userId,
        true
      )
    }

    function findSettlements(companies) {
      let query = {}
      if (params.start_date || params.end_date) {
        query.date = {}

        if (params.start_date) {
          query.date.$gte = moment(params.start_date).format('YYYY-MM-DD')
        }

        if (params.end_date) {
          query.date.$lt = moment(params.end_date)
            .add(1, 'd')
            .format('YYYY-MM-DD')
        }
      }

      query = R.merge(
        query,
        R.pick(
          ['status', 'date', 'settlement_type', 'provider'],
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
        .then(formatSettlementsQuery)
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

      function formatSettlementsQuery() {
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
            return settlementResponder(model)
          }
        }

        return paginate(
          locale,
          Settlement,
          query,
          {
            date: 'desc'
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
}
