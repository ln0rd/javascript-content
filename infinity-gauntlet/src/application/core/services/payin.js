import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Payin from 'application/core/models/payin'
import Company from 'application/core/models/company'
import { flattenObj } from 'application/core/helpers/utils'
import { paginate } from 'application/core/helpers/pagination'
import { payoutResponder } from 'application/core/responders/payout'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'

export default class PayoutService {
  static getPayins(locale, params, companyId) {
    return Promise.resolve()
      .then(formatQuery)
      .then(get)
      .then(respond)

    function formatQuery() {
      const query = {
        company_id: companyId
      }

      if (params.payin_id) {
        query.payin_id = params.payin_id
      }

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

      return R.merge(
        query,
        R.pick(
          ['status', 'provider', 'source_type', 'method'],
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
        Payin,
        query,
        {
          date: 'desc'
        },
        params.page,
        params.count,
        payoutResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getChildrenPayins(locale, params, companyId) {
    return Promise.resolve()
      .then(formatCompanyQuery)
      .then(findCompanies)
      .then(findPayouts)

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

    function findPayouts(companies) {
      let query = {}
      if (params.start_date || params.end_date) {
        query.date = {}

        if (params.payin_id) {
          query.payin_id = params.payin_id
        }

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
          ['status', 'provider', 'source_type', 'method'],
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
        .then(formatPayoutsQuery)
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

      function formatPayoutsQuery() {
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
            return payoutResponder(model)
          }
        }

        return paginate(
          locale,
          Payin,
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
