import R from 'ramda'
import config from 'application/core/config'
import moment from 'moment-timezone'
import Company from 'application/core/models/company'
import Conciliation from 'application/core/models/conciliation'
import { paginate } from 'application/core/helpers/pagination'
import { flattenObj } from 'application/core/helpers/utils'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import {
  conciliationResponder,
  conciliationResponderAddCompanyData
} from 'application/core/responders/conciliation'
import createLogger from 'framework/core/adapters/logger'
import { ConciliationError } from 'application/core/errors/conciliation-error'

const Logger = createLogger({
  name: `CONCILIATION_SERVICE`
})

export default class ConciliationService {
  static getConciliation(locale, params, companyId, conciliationType) {
    return validateParams()
      .then(getCompany)
      .then(checkCompany)
      .then(getConciliationData)
      .then(mergeWithCompanyData)
      .then(respond)
      .catch(errorHandler)

    async function validateParams() {
      if (params.company_query) {
        try {
          params.company_query = JSON.parse(params.company_query)
        } catch (e) {
          Logger.info('Invalid JSON string', 'parse-company-query')
        }
      }

      const Errors = validate('conciliation', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getCompany() {
      const query = formatCompanyQuery()

      return Company.find(query)
        .select({
          _id: 1,
          name: 1,
          company_metadata: 1
        })
        .lean()
        .exec()

      function formatCompanyQuery() {
        let rawCompanyQuery = params.company_query || {}

        if (!R.is(Object, rawCompanyQuery)) {
          try {
            rawCompanyQuery = JSON.parse(rawCompanyQuery)
          } catch (e) {
            rawCompanyQuery = {}
          }
        }

        let companyQuery = flattenObj(rawCompanyQuery)

        companyQuery.parent_id = companyId

        return companyQuery
      }
    }

    function checkCompany(companies) {
      if (companies.length === 0) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }

      return companies
    }

    function getConciliationData(companies) {
      Logger.info({ params }, `getting-${conciliationType}-conciliation`)

      const query = {
        type: conciliationType,
        company_id: {
          $in: companies.map(company => `${company._id}`)
        }
      }

      const yesterday = moment()
        .tz(config.timezone)
        .subtract(1, 'days')
        .format('YYYY-MM-DD')

      if (params.start_date) {
        query.date = {
          $gte: moment(params.start_date, 'YYYY-MM-DD')
            .tz(config.timezone)
            .format('YYYY-MM-DD')
        }
      }

      if (params.end_date) {
        if (query.date) {
          query.date['$lte'] = moment(params.end_date, 'YYYY-MM-DD')
            .tz(config.timezone)
            .format('YYYY-MM-DD')
        } else {
          query.date = {
            $lte: moment(params.end_date, 'YYYY-MM-DD')
              .tz(config.timezone)
              .format('YYYY-MM-DD')
          }
        }
      }

      if (!(params.end_date || params.start_date)) {
        query.date = {
          $gte: yesterday,
          $lte: yesterday
        }
      }

      return Promise.all([
        companies,
        paginate(
          locale,
          Conciliation,
          [
            { $match: query },
            {
              $project: {
                _id: 1,
                date: 1,
                type: 1,
                company_id: 1,
                'conciliated.sequential_file': 1
              }
            }
          ],
          {
            _id: -1
          },
          params.page,
          params.count,
          conciliationResponder,
          null,
          'aggregate'
        )
      ])
    }

    function mergeWithCompanyData(data) {
      const companies = data[0]
      const mappedCompanies = {}
      const { results, page, pages, total, perPage } = data[1]

      let conciliationData = results

      companies.forEach(company => {
        mappedCompanies[`${company._id}`] = company
      })

      conciliationData = conciliationData.map(conciliation =>
        conciliationResponderAddCompanyData(
          conciliation,
          mappedCompanies[conciliation.company_id]
        )
      )

      return { results: conciliationData, page, pages, total, perPage }
    }

    function respond(response) {
      Logger.info(
        {
          response_body: JSON.stringify(response),
          page: response.page,
          pages: response.pages,
          total: response.total,
          conciliationType,
          params
        },
        'conciliation-api-response'
      )
      return response
    }

    function errorHandler(err) {
      Logger.error({ err }, `${conciliationType}-conciliation-error`)

      // if (err instanceof ValidationError || err instanceof ModelNotFoundError) {
      //   throw err
      // }

      throw new ConciliationError(locale)
    }
  }
}
