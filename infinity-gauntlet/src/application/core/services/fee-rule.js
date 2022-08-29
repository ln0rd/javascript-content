import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import FeeRule from 'application/core/models/fee-rule'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import { feeRuleResponder } from 'application/core/responders/fee-rule'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import FeeRuleAlreadyExistsError from 'application/core/errors/fee-rule-already-exists-error'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import { createMatchFilters } from 'application/core/helpers/filter'
import { pick } from 'application/core/helpers/utils'

export default class FeeRuleService {
  static getFeeRule(locale, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkFeeRule)
      .then(respond)

    function get() {
      return FeeRule.findOne({
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkFeeRule(feeRule) {
      if (!feeRule) {
        throw new ModelNotFoundError(
          locale,
          translate('models.fee_rule', locale)
        )
      }
    }

    function respond(feeRule) {
      return feeRuleResponder(feeRule)
    }
  }

  static getChildrenFeeRules(locale, params, isoId) {
    let query = {
      iso_id: isoId
    }

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

    const filterAttributes = ['enabled', 'company_id']
    const filterParams = pick(filterAttributes, params)
    const filters = createMatchFilters(filterParams)
    query = Object.assign(query, filters)

    return paginate(
      locale,
      FeeRule,
      query,
      {
        created_at: 'desc'
      },
      params.page,
      params.count,
      feeRuleResponder
    )
  }

  static updateChildFeeRule(locale, params, childId, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(get)
      .tap(checkFeeRule)
      .tap(checkParams)
      .then(update)
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
        throw new CompanyNotBelongToParentError(locale)
      }
    }

    function get(childCompany) {
      return FeeRule.findOne({
        enabled: true,
        company_id: childCompany._id
      })
    }

    function checkFeeRule(feeRule) {
      if (!feeRule) {
        throw new ModelNotFoundError(
          locale,
          translate('models.fee_rule', locale)
        )
      }
    }

    function checkParams() {
      const Errors = validate('fee_rule', params, { checkRequired: false })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function update(feeRule) {
      if (R.has('enabled', params)) {
        feeRule.enabled = params.enabled
      }

      if (R.has('anticipation_fee', params)) {
        feeRule.anticipation_fee = params.anticipation_fee
      }

      if (R.has('anticipation_type', params)) {
        feeRule.anticipation_type = params.anticipation_type
      }

      if (R.has('brands', params)) {
        feeRule.brands = params.brands
      }

      return feeRule.save()
    }

    function respond(feeRule) {
      return feeRuleResponder(feeRule)
    }
  }

  static async createChild(locale, params, childCompanyId, parentCompanyId) {
    const childCompany = await Company.findOne({
      _id: childCompanyId,
      parent_id: parentCompanyId
    })
      .select('_id')
      .lean()
      .exec()

    if (!childCompany) {
      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    const feeRuleExists = await FeeRule.findOne({
      enabled: true,
      company_id: childCompany._id
    })
      .select('_id')
      .lean()
      .exec()

    if (feeRuleExists) {
      throw new FeeRuleAlreadyExistsError(locale)
    }

    const errors = validate('fee_rule', params, {
      checkRequired: true
    })

    if (errors) {
      throw new ValidationError(locale, errors)
    }

    params.iso_id = parentCompanyId

    params.company_id = childCompanyId

    const feeRule = await FeeRule.create(params)

    return feeRuleResponder(feeRule)
  }
}
