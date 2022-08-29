import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import Payout from 'application/core/models/payout'
import { translate } from 'framework/core/adapters/i18n'
import { paginate } from 'application/core/helpers/pagination'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { payoutResponder } from 'application/core/responders/payout'
import { createMatchFilters } from '../helpers/filter'
import { pick } from '../helpers/utils'

const Logger = createLogger({
  name: 'PAYOUT_SERVICE'
})

export default class PayoutService {
  static getSelectDefault() {
    return [
      'status',
      'status_message',
      'provider',
      'amount',
      'description',
      'automatic',
      'fee',
      'source_type',
      'destination',
      'metadata',
      'method',
      'date',
      'reason',
      'created_at',
      'updated_at',
      'company_name',
      'company_id',
      'operation_id',
      'scheduled_to',
      '_company_partial',
      'iso_id'
    ].join(' ')
  }

  static getPayouts(locale, params, companyId) {
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
        Payout,
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

  static getPayout(locale, payoutId, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkPayout)
      .then(respond)

    function get() {
      return Payout.findOne({
        _id: payoutId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkPayout(payout) {
      if (!payout) {
        throw new ModelNotFoundError(locale, translate('models.payout', locale))
      }
    }

    function respond(payout) {
      return payoutResponder(payout)
    }
  }

  static getChildrenPayouts(locale, params, companyId) {
    let query = {
      iso_id: companyId
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

    if (params.company_id) {
      query.company_id = params.company_id
    }

    const filterAttributes = ['status', 'provider', 'source_type', 'method']
    const filterParams = pick(filterAttributes, params)
    const filters = createMatchFilters(filterParams)
    query = Object.assign(query, filters)

    const select = params.fields
      ? params.fields.split(',').join(' ')
      : this.getSelectDefault()

    let sort = {
      date: 'desc'
    }

    if (params.sort) {
      try {
        sort = JSON.parse(params.sort)
      } catch (err) {
        Logger.warn(
          { err, operation: 'getChildrenPayouts', params },
          `getChildrenPayouts: JSON.parse sort param failed`
        )
      }
    }

    return paginate(
      locale,
      Payout,
      query,
      sort,
      params.page,
      params.count,
      payoutResponder,
      select
    )
  }
}
