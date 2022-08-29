import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import frameworkConfig from 'framework/core/config'
import appConfig from 'application/core/config'
import Mcc from 'application/core/models/mcc-pricing'
import Company from 'application/core/models/company'
import Provider from 'application/core/models/provider'
import FeeRule from 'application/core/models/fee-rule'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import { flattenObj } from 'application/core/helpers/utils'
import Connector from 'application/core/providers/connector'
import { validate } from 'framework/core/adapters/validator'
import Affiliation from 'application/core/models/affiliation'
import { paginate } from 'application/core/helpers/pagination'
import { hasBoletoPricing } from 'application/core/domain/pricing'
import { ECOMMERCE } from 'application/core/domain/methods'
import ValidationError from 'framework/core/errors/validation-error'
import { isProviderAllowed } from 'application/core/helpers/provider'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { affiliationResponder } from 'application/core/responders/affiliation'
import RequiredParameterError from 'framework/core/errors/required-parameter-error'
import ProviderNotAllowedError from 'application/core/errors/provider-not-allowed-error'
import AffiliationAlreadyExistsError from 'application/core/errors/affiliation-already-exists-error'
import { CHARGEBACK_HANDLING_POLICIES } from 'modules/financial-calendar/domain/chargeback-handling'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import ChargebackHandlingService from 'modules/financial-calendar/application/services/chargeback-handling'
import EcommerceCaptureMethodNotAllowed from 'application/core/errors/ecommerce-capture-method-not-allowed'
import CompanyService from 'application/core/services/company'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import sendWebHook from 'application/webhook/helpers/deliverer'

const Logger = createLogger({
  name: 'AFFILIATION_SERVICE'
})

export default class AffiliationService {
  static getAffiliations(locale, params, companyId) {
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
          ['name', 'enabled', 'status', 'provider'],
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
        Affiliation,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        affiliationResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getAffiliation(locale, affiliationId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkAffiliation)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_affiliation_get_affiliation', {
        id: affiliationId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return Affiliation.findOne({
        _id: affiliationId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkAffiliation(affiliation) {
      if (!affiliation) {
        throw new ModelNotFoundError(
          locale,
          translate('models.affiliation', locale)
        )
      }
    }

    function respond(affiliation) {
      return affiliationResponder(affiliation)
    }
  }

  static getChildrenAffiliations(locale, params, companyId) {
    return Promise.resolve()
      .then(formatCompanyQuery)
      .then(findCompanies)
      .then(findAffiliations)

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

      // Adicionamos esse if na data (26/11/2021) devido a problemas de black friday que pegamos do ISO, Neon.
      // Ainda é uma solução paliativa por conta que caso não venha esse parâmetro o endpoint continua lento.
      if (params.company_id) {
        CompanyQuery.id_str = params.company_id
      }

      return CompanyQuery
    }

    function findCompanies(query) {
      return Company.find(query)
        .lean()
        .exec()
    }

    function findAffiliations(companies) {
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
          ['name', 'enabled', 'status', 'provider'],
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
        .then(formatAffiliationsQuery)
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

      function formatAffiliationsQuery() {
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

              try {
                t.company_meta = JSON.parse(CurrentCompany.metadata)
              } catch (e) {
                t.company_meta = {}
              }

              return t
            }, response)
          }

          function format(model) {
            return affiliationResponder(model)
          }
        }

        return paginate(
          locale,
          Affiliation,
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

  static updateAffiliation(locale, params, id, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkAffiliation)
      .tap(checkParams)
      .then(update)
      .then(respond)

    function get() {
      return Affiliation.findOne({
        _id: id,
        company_id: companyId
      })
    }

    function checkAffiliation(affiliation) {
      if (!affiliation) {
        throw new ModelNotFoundError(
          locale,
          translate('models.affiliation', locale)
        )
      }
    }

    function checkParams() {
      const Errors = validate('affiliation', params, { checkRequired: false })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    async function update(affiliation) {
      if (R.has('enabled', params)) {
        affiliation.enabled = params.enabled
      }

      if (R.has('security_key', params)) {
        affiliation.security_key = params.security_key
      }

      if ('allowed_capture_methods' in params) {
        affiliation.allowed_capture_methods = await AffiliationService.validateAllowedCaptureMethod(
          companyId,
          params,
          affiliation.provider
        )
      }

      return affiliation.save()
    }

    function respond(affiliation) {
      return affiliationResponder(affiliation)
    }
  }

  static create(locale, params, companyId) {
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .tap(checkParams)
      .then(getExistingAffiliation)
      .then(addCostBasedOnMcc)
      .then(sendToProvider)
      .spread(createAffiliation)
      .tap(activateUserAndSendEmail)
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

    async function checkParams(company) {
      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', company)
      ) {
        params.provider = company.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'hash'
      }

      if (!R.has('create_merchant', params)) {
        params.create_merchant = true
      }

      if (!params.create_merchant && !R.has('merchant_id', params)) {
        throw new RequiredParameterError(locale, 'merchant_id')
      }

      if (!R.has('activation_email', params)) {
        params.activation_email = false
      }

      // To create a new ISO affiliation it is necessary the Acquirer Account Id (internal_merchant_id)
      if (!company.parent_id && !params.internal_merchant_id) {
        throw new RequiredParameterError(locale, 'internal_merchant_id')
      }

      const Errors = validate('affiliation', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      if (!isProviderAllowed(locale, params.provider)) {
        throw new ProviderNotAllowedError(locale, params.provider)
      }
      if ('allowed_capture_methods' in params) {
        params.allowed_capture_methods = await AffiliationService.validateAllowedCaptureMethod(
          company._id,
          params,
          params.provider
        )
      }

      if (
        !params.chargeback_handling_policy ||
        !CHARGEBACK_HANDLING_POLICIES.includes(
          params.chargeback_handling_policy
        )
      ) {
        params.chargeback_handling_policy = await new ChargebackHandlingService().getChargebackHandlingPolicyFromParentCompany(
          company,
          params.provider
        )
      }
    }

    function getExistingAffiliation(company) {
      return Promise.resolve()
        .then(findAffiliation)
        .tap(checkAffiliation)
        .then(respond)

      function findAffiliation() {
        return Affiliation.findOne({
          provider: params.provider,
          company_id: company._id
        })
          .lean()
          .exec()
      }

      function checkAffiliation(affiliation) {
        if (affiliation) {
          throw new AffiliationAlreadyExistsError(locale)
        }
      }

      function respond() {
        return company
      }
    }

    function addCostBasedOnMcc(company) {
      if (!R.has('mcc', company) || !R.has('parent_id', company)) {
        return company
      }

      return Promise.resolve()
        .then(findMcc)
        .then(findDefaultMcc)
        .then(checkMccAndUpdateCost)

      function findMcc() {
        return Mcc.findOne({
          company_id: company.parent_id,
          mcc: company.mcc
        })
          .lean()
          .exec()
      }

      function findDefaultMcc(mcc) {
        if (mcc) {
          return mcc
        }

        return Mcc.findOne({
          company_id: company.parent_id,
          mcc: 'default'
        })
          .lean()
          .exec()
      }

      function checkMccAndUpdateCost(mcc) {
        if (mcc) {
          params.costs = {
            anticipation_cost: mcc.anticipation_cost,
            brands: mcc.brands
          }
        }

        return company
      }
    }

    function sendToProvider(company) {
      const ProviderConnection = Connector(locale, params.provider)

      if (!params.create_merchant) {
        return {
          status: 'active',
          enabled: true
        }
      }

      return Promise.resolve()
        .then(findProvider)
        .then(sendToAffiliate)

      function findProvider() {
        return Provider.findOne({
          name: params.provider,
          enabled: true
        })
          .lean()
          .exec()
      }

      function sendToAffiliate(provider) {
        if (!provider) {
          provider = {}
        }

        return [
          ProviderConnection.affiliateMerchant(
            provider,
            company,
            params.internal_provider
          ),
          company
        ]
      }
    }

    function createAffiliation(providerAffiliation, company) {
      return Promise.resolve()
        .then(setInternalMerchant)
        .then(create)
        .tap(sendAffiliationWebHook)

      function setInternalMerchant() {
        // ISO receives Acquirer Account on request
        if (!company.parent_id) {
          return
        }

        return Promise.resolve()
          .then(getIsoAccount)
          .tap(checkIsoAccount)
          .then(getIsoAffiliation)
          .tap(checkIsoAffiliation)
          .then(setAcquirerAccount)

        function getIsoAccount() {
          return Company.findOne({ _id: company.parent_id })
        }

        function checkIsoAccount(isoCompany) {
          if (!isoCompany) {
            throw new ModelNotFoundError(
              locale,
              translate('models.company', locale)
            )
          }

          params.iso_id = isoCompany.id_str
          params._company_partial = {
            name: company.name,
            full_name: company.full_name,
            document_number: company.document_number,
            document_type: company.document_type,
            company_metadata: company.company_metadata,
            created_at: company.created_at
          }
        }

        function getIsoAffiliation(isoCompany) {
          return Affiliation.findOne({
            company_id: isoCompany._id,
            internal_provider: params.internal_provider
          })
        }

        function checkIsoAffiliation(isoAffiliation) {
          if (!isoAffiliation) {
            throw new ModelNotFoundError(
              locale,
              translate('models.affiliation', locale)
            )
          }
        }

        function setAcquirerAccount(isoAffiliation) {
          params.internal_merchant_id = isoAffiliation.internal_merchant_id
        }
      }

      function create() {
        if (R.has('merchant_id', providerAffiliation)) {
          params.merchant_id = providerAffiliation.merchant_id
        }

        if (R.has('key', providerAffiliation)) {
          params.key = providerAffiliation.key
        }

        if (R.has('internal_provider', providerAffiliation)) {
          params.internal_provider = providerAffiliation.internal_provider
        }

        params.wallet_id = R.has('wallet_id', providerAffiliation)
          ? providerAffiliation.wallet_id
          : null

        if (R.has('status', providerAffiliation)) {
          params.status = providerAffiliation.status
        }

        if (R.has('enabled', providerAffiliation)) {
          params.enabled = providerAffiliation.enabled
        }

        if (R.has('sales_key', providerAffiliation)) {
          params.sales_key = providerAffiliation.sales_key
        }

        if (R.has('provider_id', providerAffiliation)) {
          params.provider_id = providerAffiliation.provider_id
        }

        if (R.has('anticipation_type', providerAffiliation)) {
          params.anticipation_type = providerAffiliation.anticipation_type
        }

        if (R.has('anticipation_days_interval', providerAffiliation)) {
          params.anticipation_days_interval =
            providerAffiliation.anticipation_days_interval
        }

        if (R.has('provider_status_message', providerAffiliation)) {
          params.provider_status_message =
            providerAffiliation.provider_status_message
        }

        if (R.has('provider_status_code', providerAffiliation)) {
          params.provider_status_code = providerAffiliation.provider_status_code
        }

        params.company_id = companyId

        return Affiliation.create(params)
      }

      function sendAffiliationWebHook(affiliation) {
        // As of 2021-07-06 for Hash's subacquirer a affiliation
        // is created as active.
        const eventName = {
          active: 'affiliation_approved',
          blocked: 'affiliation_rejected'
        }[affiliation.status]

        if (typeof eventName === 'string') {
          return sendWebHook(
            company.parent_id,
            eventName,
            'affiliation',
            affiliation._id,
            'pending_approval',
            affiliation.status,
            affiliationResponder(affiliation)
          )
        }
      }
    }

    async function activateUserAndSendEmail(affiliation) {
      if (affiliation.status !== 'active') {
        Logger.info({ context: { affiliation } }, 'did-not-activate-user')
        return
      }

      const user = await CompanyService.activateUser(
        locale,
        affiliation.company_id
      )

      if (user && !R.includes(user.user_metadata.type, 'admin')) {
        user.user_metadata = { type: 'admin' }
        await user.save()
      }

      if (params.activation_email) {
        return sendEmail(user)
      }

      function sendEmail(user) {
        if (!user) {
          return
        }

        return Promise.resolve()
          .then(getCompany)
          .then(getParentCompany)
          .spread(sendEmail)

        function getCompany() {
          return Company.findOne({ _id: affiliation.company_id })
        }

        function getParentCompany(company) {
          return [company, Company.findOne({ _id: company.parent_id })]
        }

        function sendEmail(company, parentCompany) {
          return scheduleToDeliver(
            'base',
            'activation-email',
            appConfig.affiliation.affiliation_created_source_email,
            user.email,
            translate('mailer.activation', locale, parentCompany.name),
            locale,
            { user, company, parentCompany }
          )
        }
      }
    }

    function respond(affiliation) {
      return affiliationResponder(affiliation)
    }
  }

  /**
   * Fetch feeRule and affiliation from company to handle allowed_capture_method field changes
   * @param {string} companyId
   * @param {string} provider
   * @param {{provider: string, allowed_capture_methods: Array}}
   * @return {Promise<[]>} - allowed_capture_methods
   */
  static async validateAllowedCaptureMethod(
    companyId,
    { allowed_capture_methods },
    provider
  ) {
    const affiliation = (await Affiliation.findOne({
      company_id: companyId,
      provider
    })
      .select('_id costs.boleto_pricing')
      .lean()
      .exec()) || { costs: { boleto_pricing: {} } }

    const feeRule = (await FeeRule.findOne({
      enabled: true,
      company_id: companyId
    })
      .select('_id boleto_pricing')
      .lean()
      .exec()) || { boleto_pricing: {} }

    Logger.info(
      {
        fee_rule_id: feeRule._id,
        affiliation_id: affiliation._id,
        company_id: companyId,
        allowed_capture_methods
      },
      'validate-allowed-capture-method-changes'
    )

    return AffiliationService.handleAllowedCaptureMethodChanges(
      allowed_capture_methods,
      affiliation,
      feeRule
    )
  }

  /**
   * Allow ecommerce in allowed_capture_method changes
   * only if has configured boleto_pricing in afilliation AND fee_rule,
   *
   * @param {[]} allowedCaptureMethods
   * @param {Affiliation} affiliation
   * @param {FeeRule} feeRule
   * @return {[]} allowedCaptureMethods
   */
  static handleAllowedCaptureMethodChanges(
    allowedCaptureMethods,
    affiliation,
    feeRule
  ) {
    const hasEcommerceMethodToAllow = allowedCaptureMethods.some(
      capture_method => capture_method === ECOMMERCE
    )
    if (hasEcommerceMethodToAllow) {
      const affiliationCosts = affiliation.costs || {}
      if (
        hasBoletoPricing(affiliationCosts.boleto_pricing) &&
        hasBoletoPricing(feeRule.boleto_pricing)
      ) {
        return allowedCaptureMethods
      }
      Logger.warn(
        {
          affiliation,
          fee_rule: feeRule,
          allowed_capture_methods: allowedCaptureMethods
        },
        'ecommerce-capture-method-not-allowed'
      )
      const locale = frameworkConfig.core.i18n.defaultLocale
      throw new EcommerceCaptureMethodNotAllowed(locale)
    }
    return allowedCaptureMethods
  }

  static createChild(locale, params, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(create)

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

    function create(childCompany) {
      return this.create(locale, params, childCompany._id)
    }
  }
}
