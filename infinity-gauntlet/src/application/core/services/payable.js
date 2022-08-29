import moment from 'moment'
import createLogger from 'framework/core/adapters/logger'
import Company from 'application/core/models/company'
import Payable from 'application/core/models/payable'
import { translate } from 'framework/core/adapters/i18n'
import { pick } from 'application/core/helpers/utils'
import { createMatchFilters } from 'application/core/helpers/filter'
import { paginate } from 'application/core/helpers/pagination'
import { payableResponder } from 'application/core/responders/payable'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

const Logger = createLogger({
  name: 'PAYABLE_SERVICE'
})
export default class PayableService {
  static createMatchFilters(params) {
    const filterAttributes = [
      'card_brand',
      'type',
      'status',
      'payment_method',
      'provider',
      'transaction_id',
      'settlement_id',
      'company_id'
    ]

    const filterParams = pick(filterAttributes, params)
    return createMatchFilters(filterParams)
  }

  static createSort(operation, rawSort) {
    if (rawSort) {
      try {
        return JSON.parse(rawSort)
      } catch (err) {
        Logger.warn({ err, operation, rawSort })
      }
    }

    return {
      payment_date: 'desc'
    }
  }

  static createSelect(select) {
    if (select) {
      return select.split(',').join(' ')
    }

    return [
      'provider',
      'provider_id',
      'settlement_id',
      'mcc',
      'affiliation_id',
      'origin_affiliation_id',
      'transaction_id',
      'provider_transaction_id',
      'amount',
      'mdr_amount',
      'anticipation_amount',
      'transaction_amount',
      'fee',
      'anticipation_fee',
      'mdr_fee',
      'cost',
      'cip_escrowed_amount',
      'anticipation_cost',
      'mdr_cost',
      'total_installments',
      'installment',
      'payment_method',
      'transaction_nsu',
      'payment_date',
      'original_payment_date',
      'transaction_captured_at',
      'card_brand',
      'type',
      'origin_company_id',
      'owner_company_id',
      'status',
      'created_at',
      'updated_at',
      'company_id'
    ].join(' ')
  }

  static getPayables(locale, params, companyId) {
    let query = {
      company_id: companyId
    }

    if (params.start_date || params.end_date) {
      query.payment_date = {}

      if (params.start_date) {
        query.payment_date.$gte = moment(params.start_date).format('YYYY-MM-DD')
      }

      if (params.end_date) {
        query.payment_date.$lt = moment(params.end_date)
          .add(1, 'd')
          .format('YYYY-MM-DD')
      }
    }

    query = Object.assign(query, this.createMatchFilters(params))

    return paginate(
      locale,
      Payable,
      query,
      this.createSort('getPayables', params.sort),
      params.page,
      params.count,
      payableResponder,
      this.createSelect(params.select)
    )
  }

  static async getPayable(locale, payableId, companyId) {
    const payable = await Payable.findOne({
      _id: payableId,
      company_id: companyId
    })
      .select(this.createSelect())
      .lean()
      .read('secondary')
      .exec()

    if (!payable) {
      throw new ModelNotFoundError(locale, translate('models.payable', locale))
    }

    return payableResponder(payable)
  }

  static getChildrenPayables(locale, params, isoId) {
    let query = {
      iso_id: isoId,
      company_id: { $ne: isoId }
    }

    if (params.start_date || params.end_date) {
      query.payment_date = {}

      if (params.start_date) {
        query.payment_date.$gte = moment(params.start_date).format('YYYY-MM-DD')
      }

      if (params.end_date) {
        query.payment_date.$lt = moment(params.end_date)
          .add(1, 'd')
          .format('YYYY-MM-DD')
      }
    }

    query = Object.assign(query, this.createMatchFilters(params))

    return paginate(
      locale,
      Payable,
      query,
      this.createSort('getChildrenPayables', params.sort),
      params.page,
      params.count,
      payableResponder,
      this.createSelect(params.select)
    )
  }

  static async getTransactionPayables(locale, transactionId, companyId, query) {
    const findQuery = {
      company_id: companyId,
      transaction_id: transactionId
    }

    if (query && query.company_id) {
      const { company_id: childId } = query
      const company = await Company.find({
        _id: childId,
        parent_id: companyId
      })
        .select('_id')
        .lean()
        .read('secondary')
        .exec()

      if (company) {
        findQuery.company_id = childId
      }
    }

    return await Payable.find(findQuery)
  }
}
