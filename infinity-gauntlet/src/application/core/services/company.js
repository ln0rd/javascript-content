import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import config from 'application/core/config'
import User from 'application/core/models/user'
import Mcc from 'application/core/models/mcc-pricing'
import Company from 'application/core/models/company'
import FeeRule from 'application/core/models/fee-rule'
import IntegrationCredential from 'application/core/models/integration-credential'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import randomKey from 'application/core/helpers/random-key'
import buildCost from 'application/core/helpers/build-cost'
import { flattenObj } from 'application/core/helpers/utils'
import Connector from 'application/core/providers/connector'
import { validate } from 'framework/core/adapters/validator'
import Affiliation from 'application/core/models/affiliation'
import { CREDIT_CARD, DEBIT_CARD, EMV } from 'application/core/domain/methods'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import { companyResponder } from 'application/core/responders/company'
import { isCnpj, isCpf } from 'application/core/helpers/document-number'
import * as TransactionHelper from 'application/core/helpers/transaction'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import InvalidCompanyMetadataError from 'application/core/errors/invalid-company-metadata-error'
import ChildCompanyAlreadyExistsError from 'application/core/errors/child-company-already-exists-error'
import AnticipationTypeUpdateNotAllowedError from 'application/core/errors/anticipation-type-update-not-allowed-error'
import DocumentNumberNotSameError from 'application/core/errors/document-number-not-same-error'
import UserEmailAlreadyExistsError from 'application/core/errors/user-email-already-exists-error'
import CompanyHierarchyEditingError from 'application/core/errors/company-hierarchy-editing-error'
import CompanyHierarchyNotEditingError from 'application/core/errors/company-hierarchy-not-editing-error'
import mongoose from 'mongoose'
import hierarchy from 'application/core/domain/hierarchy'
import AffiliationService from 'application/core/services/affiliation'
import FeeRuleService from 'application/core/services/fee-rule'
import UserService from 'application/core/services/user'
import PortfolioService from 'application/core/services/portfolio'
import IntegrationService from 'application/core/services/integration'
import { userResponder } from 'application/core/responders/user'
import { PENDING } from 'application/core/domain/company-status'
import { publishMessage } from 'framework/core/adapters/queue'
import sendWebHook from 'application/webhook/helpers/deliverer'
import CompanySaveError from 'application/core/errors/company-save-error'

const { Types } = mongoose
const { ObjectId } = Types

const Logger = createLogger({
  name: 'COMPANY_SERVICE'
})

const isBankAccountValidationDisabled = company => {
  const company_metadata = company.company_metadata
  if (!company_metadata) return false

  if (!('validation_payout_disabled' in company_metadata)) return false

  return company_metadata.validation_payout_disabled
}

const isAffiliateDocumentNumber = (affiliate, parent) => {
  return affiliate.slice(0, 8) + '0001' === parent.slice(0, 12)
}

export default class CompanyService {
  static getDefaultSelect() {
    return [
      'name',
      'site_url',
      'full_name',
      'mcc',
      'logo_url',
      'estimated_monthly_tpv',
      'document_number',
      'document_type',
      'status',
      'statusV2',
      'transfer_configurations',
      'partner_id',
      'contact',
      'provider_contact',
      'created_at',
      'updated_at',
      'main_capture_method',
      'capture_method_hardware_owner',
      'email_configurations',
      'default_payment_provider',
      'users',
      'settlement_type',
      'costs',
      'default_split_rules',
      'anticipation_type',
      'anticipation_days_interval',
      'bank_account',
      'address',
      'shipping_address',
      'parent_id',
      'primary',
      'company_metadata',
      'metadata',
      'hierarchy',
      'portfolio'
    ].join(' ')
  }

  static getDefaultUserSelect() {
    return [
      'email',
      'name',
      'created_at',
      'status',
      'validation_status',
      'phone_number',
      'document_number',
      'user_metadata',
      'permissions',
      'last_info_update'
    ].join(' ')
  }

  static async getCompany(locale, companyId, userId) {
    const company = await Company.findOne({
      _id: companyId
    })
      .select(CompanyService.getDefaultSelect())
      .read('secondary')
      .lean()
      .exec()

    if (!company) {
      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    const feePromise = FeeRule.findOne({
      company_id: company._id
    })
      .read('secondary')
      .lean()
      .exec()
    const usersPromise = User.find({
      _id: { $in: company.users.map(user => user._id) }
    })
      .select(CompanyService.getDefaultUserSelect())
      .read('secondary')
      .lean()
      .exec()
    const userForHierarchyPromise = userId
      ? User.findOne({ _id: userId })
          .select(CompanyService.getDefaultUserSelect())
          .read('secondary')
          .lean()
          .exec()
      : Promise.resolve(null)

    const [fee, users, userForHierarchy] = await Promise.all([
      feePromise,
      usersPromise,
      userForHierarchyPromise
    ])

    company.user_objects = users
    company.fee_rule = fee

    return companyResponder(company, userForHierarchy)
  }

  static async getChildrenCompanies(
    locale,
    params,
    companyId,
    userId,
    shouldGetRawOrSelect
  ) {
    let rawCompanyQuery = params.company_query || {}

    if (typeof rawCompanyQuery === 'string') {
      try {
        rawCompanyQuery = JSON.parse(rawCompanyQuery)
      } catch (e) {
        rawCompanyQuery = {}
      }
    }

    let companyQuery = flattenObj(rawCompanyQuery)

    if ('q' in companyQuery) {
      companyQuery.$text = {
        $search: companyQuery.q
      }
      delete companyQuery.q
    }

    companyQuery.parent_id = companyId

    if (params.start_date || params.end_date) {
      companyQuery.created_at = {}

      if (params.start_date) {
        companyQuery.created_at.$gte = moment(params.start_date)
          .startOf('day')
          .toDate()
      }

      if (params.end_date) {
        companyQuery.created_at.$lte = moment(params.end_date)
          .endOf('day')
          .toDate()
      }
    }

    if (params.company_id) {
      companyQuery = Object.assign(companyQuery, { ['_id']: params.company_id })
    }

    ;['mcc', 'status', 'document_number', 'contact.phone'].forEach(key => {
      const value = params[key]
      if (value) {
        companyQuery = Object.assign(companyQuery, { [key]: value })
      }
    })

    const portfolioIds = await PortfolioService.getPortfolioIds(
      companyId,
      userId
    )

    if (portfolioIds && portfolioIds.length > 0) {
      Object.assign(companyQuery, {
        portfolio: { $in: portfolioIds }
      })
    }

    async function responder(response) {
      const usersIds = []
      const feesIds = []

      response.forEach(company => {
        usersIds.push(...company.users)
        feesIds.push(company._id)
      })

      const usersPromise = User.find({
        _id: { $in: usersIds }
      })
        .select(CompanyService.getDefaultUserSelect())
        .lean()
        .exec()
      const feesPromise = FeeRule.find({
        company_id: { $in: feesIds }
      })

      const [users, fees] = await Promise.all([usersPromise, feesPromise])

      response = response.map(company => {
        company.user_objects = users.filter(user =>
          company.users.map(id => id.toString()).includes(user._id.toString())
        )
        company.fee_rule = fees.find(
          fee => fee.company_id.toString() === company._id.toString()
        )

        return company
      })

      return companyResponder(response)
    }

    if (shouldGetRawOrSelect) {
      const companyFind = Company.find(companyQuery)

      if (typeof shouldGetRawOrSelect === 'string') {
        companyFind.select(shouldGetRawOrSelect)
      }

      return companyFind.lean().exec()
    }

    let sort = {
      created_at: 'desc'
    }

    if (params.sort) {
      try {
        sort = JSON.parse(params.sort)
      } catch (err) {
        Logger.warn(
          { err, operation: 'getChildrenCompanies', params },
          'getChildrenCompanies: JSON.parse sort param failed'
        )
      }
    }

    return paginate(
      locale,
      Company,
      companyQuery,
      sort,
      params.page,
      params.count,
      responder,
      CompanyService.getDefaultSelect()
    )
  }

  static async activateUser(locale, companyId) {
    const user = await findUser()

    if (!user) {
      return
    }

    return Promise.resolve(user).then(updateStatus)

    function findUser() {
      return User.findOne({ status: 'pending_confirmation' })
        .elemMatch('permissions', { company_id: companyId })
        .exec()
    }

    function updateStatus(user) {
      user.status = 'active'

      return user.save()
    }
  }

  static updateCompany(locale, params, id, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkCompany)
      .tap(canUpdate)
      .tap(checkParams)
      .tap(validateDefaultSplitRules)
      .then(update)
      .then(validateBankAccount)
      .then(respond)

    function get() {
      return Company.findById(id)
    }

    function checkCompany(company) {
      if (!company) {
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    async function canUpdate(company) {
      const authCompany = await Company.findById(companyId)

      // When the authorized company is an ISO it can change itself and its children
      if (authCompany.primary && company.parent_id === authCompany.id) {
        return
      }

      // When the authorized company is an ISO / Merchant he can change yourself
      if (company.id === authCompany.id) {
        return
      }

      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    function checkParams() {
      params = R.reject(R.isNil, params)

      const Errors = validate('company', params, { checkRequired: false })
      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function validateDefaultSplitRules(company) {
      if (R.has('default_split_rules', params)) {
        return TransactionHelper.validateDefaultSplitRule(
          locale,
          params.default_split_rules,
          company
        )
      }
    }

    async function update(company) {
      const removeWhiteSpaces = str => str.replace(/\s+/g, '')

      if ('metadata' in params) {
        if (typeof params.metadata === 'object') {
          params.metadata = JSON.stringify(params.metadata)
        }

        company.metadata = params.metadata
      }

      if ('name' in params) {
        company.name = params.name
      }

      if ('full_name' in params) {
        company.full_name = params.full_name
      }

      if ('estimated_monthly_tpv' in params) {
        company.full_name = params.full_name
      }

      if ('site_url' in params) {
        company.site_url = params.site_url
      }

      if ('settlement_type' in params) {
        company.settlement_type = params.settlement_type
      }

      if ('type' in params) {
        company.type = params.type
      }

      if ('capture_method_hardware_owner' in params) {
        company.capture_method_hardware_owner =
          params.capture_method_hardware_owner
      }

      if ('main_capture_method' in params) {
        company.main_capture_method = params.main_capture_method
      }

      if ('address' in params) {
        company.address = company.address || {}

        if ('street' in params.address) {
          company.address.street = params.address.street
        }

        if ('street_number' in params.address) {
          company.address.street_number = params.address.street_number
        }

        if ('complement' in params.address) {
          company.address.complement = params.address.complement
        }

        if ('neighborhood' in params.address) {
          company.address.neighborhood = params.address.neighborhood
        }

        if ('zipcode' in params.address) {
          company.address.zipcode = params.address.zipcode
        }

        if ('country' in params.address) {
          company.address.country = params.address.country
        }

        if ('state' in params.address) {
          company.address.state = params.address.state
        }

        if ('city' in params.address) {
          company.address.city = params.address.city
        }
      }

      if ('shipping_address' in params) {
        company.shipping_address = company.shipping_address || {}

        if ('street' in params.shipping_address) {
          company.shipping_address.street = params.shipping_address.street
        }

        if ('street_number' in params.shipping_address) {
          company.shipping_address.street_number =
            params.shipping_address.street_number
        }

        if ('complement' in params.shipping_address) {
          company.shipping_address.complement =
            params.shipping_address.complement
        }

        if ('neighborhood' in params.shipping_address) {
          company.shipping_address.neighborhood =
            params.shipping_address.neighborhood
        }

        if ('zipcode' in params.shipping_address) {
          company.shipping_address.zipcode = params.shipping_address.zipcode
        }

        if ('country' in params.shipping_address) {
          company.shipping_address.country = params.shipping_address.country
        }

        if ('state' in params.shipping_address) {
          company.shipping_address.state = params.shipping_address.state
        }

        if ('city' in params.shipping_address) {
          company.shipping_address.city = params.shipping_address.city
        }
      }

      if ('contact' in params) {
        company.contact = company.contact || {}

        if ('name' in params.contact) {
          company.contact.name = params.contact.name
        }

        if ('phone' in params.contact) {
          company.contact.phone = params.contact.phone
        }

        if ('email' in params.contact) {
          company.contact.email = params.contact.email
        }
      }

      if ('transfer_configurations' in params) {
        company.transfer_configurations = company.transfer_configurations || {}

        if ('automatic_transfer_enabled' in params.transfer_configurations) {
          company.transfer_configurations.automatic_transfer_enabled =
            params.transfer_configurations.automatic_transfer_enabled
        }

        if ('transfer_frequency' in params.transfer_configurations) {
          company.transfer_configurations.transfer_frequency =
            params.transfer_configurations.transfer_frequency
        }

        if ('transfer_date' in params.transfer_configurations) {
          company.transfer_configurations.transfer_date =
            params.transfer_configurations.transfer_date
        }

        if ('rail' in params.transfer_configurations) {
          company.transfer_configurations.rail =
            params.transfer_configurations.rail
        }
      }

      if ('bank_account' in params) {
        let dirtyBankAccount = false
        company.bank_account = company.bank_account || {}

        if (
          'legal_name' in params.bank_account &&
          company.bank_account.legal_name !== params.bank_account.legal_name
        ) {
          dirtyBankAccount = true
          company.bank_account.legal_name = params.bank_account.legal_name
        }

        if (
          'bank_code' in params.bank_account &&
          company.bank_account.bank_code !== params.bank_account.bank_code
        ) {
          dirtyBankAccount = true
          company.bank_account.bank_code = params.bank_account.bank_code
        }

        if ('agencia' in params.bank_account) {
          const cleanBranch = removeWhiteSpaces(params.bank_account.agencia)

          if (company.bank_account.agencia !== cleanBranch) {
            dirtyBankAccount = true
            company.bank_account.agencia = cleanBranch
          }
        }

        if ('agencia_dv' in params.bank_account) {
          const cleanBranchVerifier = removeWhiteSpaces(
            params.bank_account.agencia_dv
          )

          if (company.bank_account.agencia_dv !== cleanBranchVerifier) {
            dirtyBankAccount = true
            company.bank_account.agencia_dv = cleanBranchVerifier
          }
        }

        if ('conta' in params.bank_account) {
          const cleanAccount = removeWhiteSpaces(params.bank_account.conta)

          if (company.bank_account.conta !== cleanAccount) {
            dirtyBankAccount = true
            company.bank_account.conta = cleanAccount
          }
        }

        if ('conta_dv' in params.bank_account) {
          const cleanAccountVerifier = removeWhiteSpaces(
            params.bank_account.conta_dv
          )

          if (company.bank_account.conta_dv !== cleanAccountVerifier) {
            dirtyBankAccount = true
            company.bank_account.conta_dv = cleanAccountVerifier
          }
        }

        if (
          'type' in params.bank_account &&
          company.bank_account.type !== params.bank_account.type
        ) {
          dirtyBankAccount = true
          company.bank_account.type = params.bank_account.type
        }

        if ('document_number' in params.bank_account) {
          if (
            validateBankAccountDocumentNumber(
              params.bank_account,
              company.document_number
            )
          ) {
            company.bank_account.document_number =
              params.bank_account.document_number
          }
        }

        const hasValidationPayoutDisabledFlag =
          'company_metadata' in params &&
          'validation_payout_disabled' in params.company_metadata

        if (
          hasValidationPayoutDisabledFlag &&
          company.company_metadata.validation_payout_disabled !==
            params.company_metadata.validation_payout_disabled
        ) {
          dirtyBankAccount = true
        }

        const bankAccountValidationDisabled = hasValidationPayoutDisabledFlag
          ? isBankAccountValidationDisabled(params)
          : isBankAccountValidationDisabled(company)

        if (
          dirtyBankAccount ||
          (company.bank_account.status === 'pending' &&
            bankAccountValidationDisabled)
        ) {
          company.bank_account.status = bankAccountValidationDisabled
            ? 'valid'
            : 'pending'
        }
      }

      if ('company_metadata' in params) {
        R.map(obj => {
          if (R.is(Object, obj)) {
            throw new InvalidCompanyMetadataError(locale)
          }
        }, params.company_metadata)

        company.company_metadata = R.merge(
          company.company_metadata,
          params.company_metadata
        )
      }

      if ('default_split_rules' in params) {
        company.default_split_rules = params.default_split_rules
      }

      if ('default_payment_provider' in params) {
        company.default_payment_provider = params.default_payment_provider
      }

      try {
        return await company.save()
      } catch (err) {
        Logger.error(
          {
            err,
            companyId: company._id
          },
          'company-save-error'
        )
        throw new CompanySaveError(locale, err)
      }
    }

    function validateBankAccountDocumentNumber(bank_account, document_number) {
      if (
        isCnpj(bank_account.document_number) &&
        isAffiliateDocumentNumber(document_number, bank_account.document_number)
      ) {
        return true
      }
      if (bank_account.document_number !== document_number) {
        throw new DocumentNumberNotSameError(locale)
      }
      return true
    }

    function validateBankAccount(company) {
      if (
        !isBankAccountValidationDisabled(company) &&
        company.bank_account &&
        company.bank_account.status === 'pending'
      ) {
        publishMessage(
          'CreateValidationPayout',
          Buffer.from(JSON.stringify({ companyId: company._id }))
        )
      }
      return company
    }

    function respond(company) {
      return companyResponder(company)
    }
  }

  static updateChildCompany(locale, params, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(update)

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

    function update(childCompany) {
      return this.updateCompany(
        locale,
        params,
        childCompany._id,
        childCompany._id
      )
    }
  }

  static updateAnticipation(locale, params, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkCompany)
      .tap(checkParams)
      .then(getMainAffiliation)
      .spread(validateOnProvider)
      .then(updateCompany)
      .then(respond)

    function get() {
      return Company.findOne({
        _id: companyId
      })
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
      params = R.reject(R.isNil, params)

      if (R.has('default_payment_provider', company.toObject())) {
        params.provider = company.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'hash'
      }

      const Errors = validate('request_anticipation_update', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getMainAffiliation(company) {
      const Query = {
        company_id: companyId,
        status: 'active',
        provider: params.provider
      }

      return [
        company,
        Affiliation.findOne(Query)
          .lean()
          .exec()
      ]
    }

    function validateOnProvider(company, affiliation) {
      if (!affiliation) {
        throw new ModelNotFoundError(
          locale,
          translate('models.affiliation', locale)
        )
      }

      return Promise.resolve()
        .then(getAffiliationOnProvider)
        .tap(validateAffiliation)
        .then(respondValidation)

      function getAffiliationOnProvider() {
        const ProviderConnection = Connector(locale, params.provider)

        return ProviderConnection.getAffiliation(affiliation)
      }

      function validateAffiliation(providerAffiliation) {
        if (
          R.has('anticipation_type', providerAffiliation) &&
          providerAffiliation.anticipation_type !== params.anticipation_type
        ) {
          throw new AnticipationTypeUpdateNotAllowedError(locale)
        }
      }

      function respondValidation() {
        return company
      }
    }

    function updateCompany(company) {
      const beforeUpdate = {
        anticipationType: company.anticipation_type,
        anticipationDaysInterval: company.anticipation_days_interval
      }
      if (R.has('anticipation_type', params)) {
        company.anticipation_type = params.anticipation_type
      }

      if (R.has('anticipation_days_interval', params)) {
        company.anticipation_days_interval = params.anticipation_days_interval
      }

      Logger.info(
        {
          context: {
            companyServiceUpdateAnticipation: {
              params,
              beforeUpdate
            }
          }
        },
        'company-anticipation-rules-updated'
      )
      return company.save()
    }

    function respond(company) {
      return companyResponder(company)
    }
  }

  static updateChildAnticipation(locale, params, childId, companyId) {
    return Promise.bind(this)
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(update)

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

    function update(childCompany) {
      return this.updateAnticipation(locale, params, childCompany._id)
    }
  }

  static create(locale, params) {
    return Promise.resolve()
      .tap(checkParams)
      .then(applyDefaults)
      .then(getSameChildCompany)
      .tap(checkSameChildCompany)
      .tap(validateCompanyMetadata)
      .tap(validateDefaultSplitRules)
      .tap(createHashKey)
      .then(addCostBasedOnMcc)
      .then(createCompany)
      .then(createOrUpdateUser)
      .then(respond)

    function checkParams() {
      const RequestErrors = validate('request_company_create', params)

      if (RequestErrors) {
        throw new ValidationError(locale, RequestErrors)
      }

      const Errors = validate('company', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function applyDefaults() {
      if (!R.has('primary', params)) {
        params.primary = false
      }

      if (R.has('metadata', params) && R.is(Object, params.metadata)) {
        params.metadata = JSON.stringify(params.metadata)
      }

      if (
        R.has('default_split_rules', params) &&
        !R.is(Array, params.default_split_rules)
      ) {
        params.default_split_rules = []
      }

      if (!R.has('provider_contact', params) && R.has('contact', params)) {
        params.provider_contact = params.contact
      }

      if (isCnpj(params.document_number)) {
        params.document_type = 'cnpj'
      } else if (isCpf(params.document_number)) {
        params.document_type = 'cpf'
      }

      if (R.has('bank_account', params)) {
        params.bank_account.legal_name = params.full_name
        params.bank_account.document_number = params.document_number
        params.bank_account.document_type = params.document_type
        params.bank_account.status = isBankAccountValidationDisabled(params)
          ? 'valid'
          : 'pending'
      }

      params.email = params.email.toLowerCase()
    }

    function getSameChildCompany() {
      if (!R.has('parent_id', params)) {
        return
      }

      return Company.findOne({
        document_number: params.document_number,
        parent_id: params.parent_id
      })
        .lean()
        .exec()
    }

    function checkSameChildCompany(company) {
      if (company) {
        throw new ChildCompanyAlreadyExistsError(locale)
      }
    }

    function validateCompanyMetadata() {
      if (R.has('company_metadata', params)) {
        R.map(obj => {
          if (R.is(Object, obj)) {
            throw new InvalidCompanyMetadataError(locale)
          }
        }, params.company_metadata)
      }
    }

    function validateDefaultSplitRules() {
      if (R.has('default_split_rules', params)) {
        return TransactionHelper.validateDefaultSplitRule(
          locale,
          params.default_split_rules
        )
      }
    }

    function createHashKey() {
      params.hash_key = `hash_${randomKey(30)}`
    }

    function addCostBasedOnMcc() {
      if (!R.has('mcc', params) || !R.has('parent_id', params)) {
        return
      }

      return Promise.resolve()
        .then(findMcc)
        .then(findDefaultMcc)
        .tap(checkMccAndUpdateCost)

      function findMcc() {
        return Mcc.findOne({
          company_id: params.parent_id,
          mcc: params.mcc
        })
          .lean()
          .exec()
      }

      function findDefaultMcc(mcc) {
        if (mcc) {
          return mcc
        }

        return Mcc.findOne({
          company_id: params.parent_id,
          mcc: 'default'
        })
          .lean()
          .exec()
      }

      function checkMccAndUpdateCost(mcc) {
        if (mcc) {
          params.costs = buildCost(mcc)
        }
      }
    }

    function createCompany() {
      params.status = 'pending_confirmation'
      params.statusV2 = PENDING

      return Company.create(params)
    }

    function createOrUpdateUser(company) {
      return Promise.resolve()
        .then(getUser)
        .then(createOrUpdate)
        .then(updateCompany)

      function getUser() {
        return User.findOne({
          email: params.email
        })
      }

      function createOrUpdate(user) {
        if (user) {
          user.permissions.push({
            company_id: company._id,
            permission: 'admin'
          })

          return user.save()
        }

        const userData = {
          name: company.name,
          email: params.email,
          document_number: company.document_number,
          document_type: company.document_type,
          status: 'pending_confirmation',
          activation_token: randomKey(30),
          permissions: [
            {
              company_id: company._id,
              permission: 'admin'
            }
          ]
        }

        if (params.email === company.contact.email && company.contact.phone) {
          userData.phone_number = company.contact.phone
        }

        return User.create(userData)
      }

      function updateCompany(user) {
        company.users.push(user)

        company.user_objects = company.users

        return company.save()
      }
    }

    function respond(company) {
      return companyResponder(company)
    }
  }

  static async notifyCompanyStatusChange(company, previousStatus, newStatus) {
    try {
      if (!company.parent_id) {
        Logger.info(
          { company_id: company._id },
          'notify-company-status-change',
          'company does not have parent to notify'
        )
        return
      }

      await sendWebHook(
        company.parent_id,
        'company_status_updated',
        'company',
        company._id,
        previousStatus,
        newStatus,
        companyResponder(company)
      )
    } catch (err) {
      Logger.error(
        { err, company_id: company._id },
        'notify-company-status-change-err'
      )
    }
  }

  static async updateCompanyStatus(locale, params, companyId) {
    params = R.reject(R.isNil, params)

    const Errors = validate('request_update_company_status', params)
    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const company = await Company.findOne({
      _id: companyId
    })
    if (!company) {
      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    const previousStatus = company.statusV2 || PENDING
    company.statusV2 = params.status

    try {
      await company.save()
    } catch (err) {
      Logger.error(
        { err, company_id: companyId, status: params.status },
        'update-company-status-err'
      )
      throw err
    }

    await this.notifyCompanyStatusChange(
      company,
      previousStatus,
      company.statusV2
    )

    return companyResponder(company)
  }

  static createChild(locale, params, companyId) {
    return Promise.bind(this)
      .then(getCompany)
      .tap(checkCompany)
      .tap(applyDefaults)
      .tap(inheritRegisteredEvents)
      .then(create)

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

    function applyDefaults(company) {
      params.parent_id = companyId
      params.primary = false
      params.partner_id = company.partner_id
      params.default_payment_provider = company.default_payment_provider

      if (
        R.has('default_split_rules', company) &&
        !R.has('default_split_rules', params)
      ) {
        params.default_split_rules = company.default_split_rules
      }
    }

    function inheritRegisteredEvents(company) {
      if (company.registered_events && company.registered_events.length > 0) {
        const inheritableRegisteredEvents = company.registered_events.filter(
          registeredEvent => registeredEvent.inheritable
        )

        params.registered_events = inheritableRegisteredEvents
      }
    }

    function create() {
      return this.create(locale, params)
    }
  }

  static allowEditHierarchy(locale, userId, companyId) {
    return Promise.all([getCompany(), getUser()]).spread((company, user) => {
      return tryAllowEdit(company, user).then(result => {
        if (!result) {
          throw new CompanyHierarchyEditingError(locale, company.hierarchy.user)
        }
        return companyResponder(result, user)
      })
    })

    function getCompany() {
      return Company.findById(companyId)
        .lean()
        .exec()
    }

    function getUser() {
      return User.findById(userId)
        .lean()
        .exec()
    }

    function tryAllowEdit(company, user) {
      const now = moment()
      let query = { _id: company._id }

      if (
        company.hierarchy &&
        company.hierarchy.edit_time &&
        now.diff(moment.unix(company.hierarchy.edit_time), 'minutes') < 30
      ) {
        query.$or = [
          { 'hierarchy.editing': { $exists: false } },
          { 'hierarchy.editing': false },
          {
            'hierarchy.editing': true,
            'hierarchy.user': user.email
          }
        ]
      }

      return Company.findOneAndUpdate(
        query,
        {
          'hierarchy.data': company.hierarchy
            ? company.hierarchy.data || []
            : [],
          'hierarchy.editing': true,
          'hierarchy.edit_time': now.unix(),
          'hierarchy.user': user.email
        },
        { new: true }
      )
        .lean()
        .exec()
    }
  }

  static editHierarchy(locale, operations, userId, companyId) {
    return Promise.all([getCompany(), getUser()]).spread((company, user) => {
      return tryEdit(company, user, operations).then(result => {
        if (!result) {
          if (company.hierarchy.user) {
            throw new CompanyHierarchyEditingError(
              locale,
              company.hierarchy.user
            )
          } else {
            throw new CompanyHierarchyNotEditingError(locale)
          }
        }
        return companyResponder(result, user)
      })
    })

    function getCompany() {
      return Company.findById(companyId)
        .lean()
        .exec()
    }

    function getUser() {
      return User.findById(userId)
        .lean()
        .exec()
    }

    function transformParams(params) {
      if (params.length === 0) return []

      return params.reduce((cur, nex) => {
        return Array.isArray(nex)
          ? cur.concat([transformParams(nex)])
          : cur.concat(new ObjectId(nex.toString()))
      }, [])
    }

    function tryEdit(company, user, operations) {
      return Company.findOneAndUpdate(
        {
          'hierarchy.editing': true,
          'hierarchy.user': user.email,
          _id: company._id
        },
        {
          'hierarchy.data': operations.reduce(
            (cur, nex) =>
              hierarchy[nex.operation](cur, ...transformParams(nex.params)),
            company.hierarchy.data
          ),
          'hierarchy.editing': false,
          'hierarchy.edit_time': null,
          'hierarchy.user': null
        },
        { new: true }
      )
        .lean()
        .exec()
    }
  }

  static cancelEditHierarchy(locale, userId, companyId) {
    return Promise.all([getCompany(), getUser()]).spread((company, user) => {
      return tryCancelEdit(company, user).then(result => {
        if (!result) {
          if (company.hierarchy.user) {
            throw new CompanyHierarchyEditingError(
              locale,
              company.hierarchy.user
            )
          } else {
            throw new CompanyHierarchyNotEditingError(locale)
          }
        }
        return companyResponder(result, user)
      })
    })

    function getCompany() {
      return Company.findById(companyId)
        .lean()
        .exec()
    }

    function getUser() {
      return User.findById(userId)
        .lean()
        .exec()
    }

    function tryCancelEdit(company, user) {
      return Company.findOneAndUpdate(
        {
          'hierarchy.editing': true,
          'hierarchy.user': user.email,
          _id: company._id
        },
        {
          'hierarchy.editing': false,
          'hierarchy.edit_time': null,
          'hierarchy.user': null
        },
        { new: true }
      )
        .lean()
        .exec()
    }
  }

  static hierarchyMissingUsers(locale, companyId) {
    return Promise.resolve()
      .then(getCompany)
      .then(findMissingUsers)
      .then(userResponder)

    function getCompany() {
      return Company.findById(companyId)
        .lean()
        .exec()
    }

    function flattenTree(tree) {
      return tree.reduce(
        (cur, nex) =>
          Array.isArray(nex) ? cur.concat(flattenTree(nex)) : cur.concat(nex),
        []
      )
    }

    function findMissingUsers(company) {
      const hierarchyData = company.hierarchy ? company.hierarchy.data : []
      const usersInHierarchy = flattenTree(hierarchyData)

      const missingUserIds = company.users.reduce(
        (missingUsers, userId) =>
          usersInHierarchy.find(u => u.toString() === userId.toString())
            ? missingUsers
            : missingUsers.concat(userId),
        []
      )
      return User.find({ _id: { $in: missingUserIds } })
        .lean()
        .exec()
    }
  }

  static async publicCreateChild(locale, params) {
    /**
     * @todo move fixed informations to collection in database for use this endpoint in any client
     */

    const Errors = validate('request_public_company_create', params)

    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const emailAlreadyExists = await User.findOne({
      email: params.email
    })
      .select('_id')
      .lean()
      .exec()

    if (emailAlreadyExists) {
      throw new UserEmailAlreadyExistsError(locale)
    }

    const companyId = config.migrate_client.leo.newCompanyId

    params.mcc = '5211'
    params.anticipation_type = 'automatic'
    params.anticipation_days_interval = 1
    params.default_payment_provider = 'hash'

    Logger.info({ params }, 'create-child-company')
    let company = {}

    company = await CompanyService.createChild(locale, params, companyId)

    // all fixed informations together to easy updates
    const affiliationData = {
      anticipation_type: 'automatic',
      create_merchant: true,
      enabled: true,
      internal_provider: 'pags',
      provider: 'hash',
      activation_email: true,
      allowed_capture_methods: [EMV],
      allowed_payment_methods: [CREDIT_CARD, DEBIT_CARD]
    }

    const basefee = {
      debit: 0,
      credit_1: 0,
      credit_2: 0,
      credit_7: 0
    }
    const feeData = {
      anticipation_fee: 2.49,
      anticipation_type: 'per_month',
      brands: [
        'visa',
        'mastercard',
        'hiper',
        'elo',
        'amex',
        'diners',
        'discover',
        'aura'
      ].map(brand => ({ brand, fee: basefee }))
    }

    try {
      await createFeeRules()
      if (params.portfolio) {
        await createPortfolio()
      }
      await createIntegrationCredentials()
      // here always throw exception because this if ignore return of this method
      await createAffiliation()
    } catch (err) {
      Logger.error({ err }, 'create-child-company-err')
    }

    return {
      company_id: company.id
    }

    function createPortfolio() {
      const portfolioData = {
        clientId: companyId,
        merchantId: company.id,
        destinationPortfolioId: params.portfolio
      }

      Logger.info({ portfolioData }, 'create-portfolio')

      return PortfolioService.transferMerchant(portfolioData)
    }

    function createIntegrationCredentials() {
      const integrationData = {
        name: 'sapleomadeiras',
        key: params.company_metadata.sap_code,
        username: 'split',
        password: 'split'
      }

      Logger.info({ integrationData }, 'create-child-integration-credential')

      return IntegrationService.createChildCredential(
        locale,
        integrationData,
        company.parent_id,
        company.id
      )
    }

    function createAffiliation() {
      Logger.info({ affiliationData }, 'create-affiliation')

      return AffiliationService.create(locale, affiliationData, company.id)
    }

    function createFeeRules() {
      Logger.info({ feeData }, 'create-child-fee-rules')
      return FeeRuleService.createChild(locale, feeData, company.id, companyId)
    }
  }

  static async publicSearchDocumentNumberChild(params) {
    /**
     * Endpoint exclusive to leo and leo clients
     */

    const oldCompanyIdClientLeo = config.migrate_client.leo.oldCompanyId

    const leoCompanys = await Company.find({
      parent_id: oldCompanyIdClientLeo
    })
      .select('id_str')
      .lean()
      .exec()

    // Here we search children from childrens of Leo
    const childCompany = await Company.findOne({
      parent_id: { $in: leoCompanys.map(c => c.id_str) },
      document_number: params.document_number
    })
      .lean()
      .exec()

    return childCompany ? true : false
  }

  static async migrateChild(locale, params, childCompanyId, userId) {
    /**
     * Endpoint exclusive to leo and leo clients
     */

    const Errors = validate('request_migrate_company', params)

    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const oldCompanyIdClientLeo = config.migrate_client.leo.oldCompanyId
    const newCompanyIdClientLeo = config.migrate_client.leo.newCompanyId

    params.mcc = '5211'
    params.anticipation_type = 'automatic'
    params.anticipation_days_interval = 1
    params.default_payment_provider = 'hash'

    params.transfer_configurations = {
      transfer_date: 1,
      transfer_frequency: 'daily',
      automatic_transfer_enabled: true
    }

    const leoCompanys = await Company.find({
      parent_id: oldCompanyIdClientLeo
    })
      .select('id_str')
      .lean()
      .exec()

    // Here we search children from childrens of Leo
    const childCompany = await Company.findOne({
      _id: childCompanyId,
      parent_id: { $in: leoCompanys.map(c => c.id_str) }
    })
      .lean()
      .exec()

    await CompanyService.updateChildCompany(
      locale,
      params,
      childCompanyId,
      childCompany.parent_id
    )

    try {
      await updateFeeRules()
      if (params.portfolio) {
        await updatePortfolio()
      }
      await integrationCredentials()
      await updateUserPassword()
      await updateAffiliation()
      await updateChild()
    } catch (err) {
      Logger.error({ err, company_id: childCompanyId }, 'migrate-company-err')
      throw err
    }

    return {
      company_id: childCompanyId
    }

    async function updateFeeRules() {
      const basefee = {
        debit: 0,
        credit_1: 0,
        credit_2: 0,
        credit_7: 0
      }

      const feeData = {
        anticipation_fee: 2.49,
        anticipation_type: 'per_month',
        brands: [
          'visa',
          'mastercard',
          'hiper',
          'elo',
          'amex',
          'diners',
          'discover',
          'aura'
        ].map(brand => ({ brand, fee: basefee }))
      }

      const feeRules = await FeeRule.findOne({
        enabled: true,
        company_id: childCompanyId
      })
        .lean()
        .exec()

      if (feeRules) {
        Logger.info({ feeData }, 'update-child-fee-rules')
        return FeeRuleService.updateChildFeeRule(
          locale,
          feeData,
          childCompanyId,
          childCompany.parent_id
        )
      }

      Logger.info({ feeData }, 'create-child-fee-rules')
      return FeeRuleService.createChild(
        locale,
        feeData,
        childCompanyId,
        childCompany.parent_id
      )
    }

    async function updatePortfolio() {
      const portfolioData = {
        clientId: childCompany.parent_id,
        merchantId: childCompanyId,
        destinationPortfolioId: params.portfolio
      }

      Logger.info({ portfolioData }, 'update-portfolio')

      return PortfolioService.transferMerchant(portfolioData)
    }

    async function integrationCredentials() {
      const integrationData = {
        name: 'sapleomadeiras',
        key: params.company_metadata.sap_code,
        username: 'split',
        password: 'split'
      }

      Logger.info({ integrationData }, 'update-child-integration-credential')

      const integration = await IntegrationCredential.findOne({
        company_id: childCompanyId
      })
        .lean()
        .exec()

      if (integration) {
        return IntegrationService.updateChildCredential(
          locale,
          childCompanyId,
          childCompany.parent_id,
          integration._id.toString(),
          { key: params.company_metadata.sap_code }
        )
      }

      return IntegrationService.createChildCredential(
        locale,
        integrationData,
        childCompany.parent_id,
        childCompanyId
      )
    }

    async function updateUserPassword() {
      const passwordData = {
        new_password: params.password,
        current_password: params.current_password
      }

      return UserService.updatePassword(locale, passwordData, userId, userId)
    }

    async function updateAffiliation() {
      const affiliationData = {
        anticipation_type: 'automatic',
        create_merchant: true,
        enabled: true,
        internal_provider: 'pags',
        provider: 'hash',
        activation_email: false,
        allowed_capture_methods: [EMV],
        allowed_payment_methods: [CREDIT_CARD, DEBIT_CARD]
      }

      Logger.info({ affiliationData }, 'update-child-affiliation')

      const affiliation = await Affiliation.findOne({
        provider: 'hash',
        company_id: childCompanyId
      })
        .lean()
        .exec()

      if (!affiliation) {
        return AffiliationService.create(
          locale,
          affiliationData,
          childCompanyId
        )
      }

      return
    }

    async function updateChild() {
      /**
       * registered_events is to allow company execute transactions @see https://github.com/hashlab/hashlab/commit/966ca92909b68b408b8466c243e71fe12478995f
       */
      const registered_events = [
        {
          event_handler: '5d5ae4b37d9aa900088a753a',
          event_source: '5d3f5d47385c0800074e020c',
          priority: 10,
          enabled: true,
          inheritable: false
        },
        {
          event_handler: '5d5ae4b37d9aa900088a753a',
          event_source: '5d4195aa5a87e800074340f4',
          priority: 10,
          enabled: true,
          inheritable: false
        }
      ]

      return Company.updateOne(
        {
          _id: childCompanyId
        },
        {
          $set: {
            registered_events: registered_events,
            parent_id: newCompanyIdClientLeo.toString()
          }
        }
      )
    }
  }

  static async listStores() {
    const companies = await Company.find(
      {
        'company_metadata.is_loja_leo': true
      },
      'name portfolio _id company_metadata.sap_code'
    )
      .lean()
      .exec()

    return companies
      .filter(
        company => company.company_metadata && company.company_metadata.sap_code
      )
      .map(company => ({
        id: company._id,
        name: company.name,
        code: company.company_metadata.sap_code,
        portfolio: company.portfolio
      }))
  }

  static async removeUserFromCompany(locale, companyId, userId) {
    Logger.info(
      {
        companyId: companyId,
        user: userId
      },
      'remove-user-from-company-request'
    )

    const company = await Company.findOne({ _id: companyId })
      .select('users')
      .exec()

    if (!company) {
      Logger.error(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-from-company-company-not-found'
      )

      throw new ModelNotFoundError(locale, translate('models.company', locale))
    }

    if (!company.users) {
      Logger.info(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-from-company-no-users'
      )

      return
    }

    const userIndex = company.users.findIndex(
      user => user.toString() === userId
    )

    if (userIndex < 0) {
      Logger.info(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-from-company-user-not-found'
      )

      return
    }

    company.users.splice(userIndex, 1)
    await company.save()

    Logger.info(
      {
        companyId: companyId,
        user: userId
      },
      'remove-user-from-company-success'
    )

    return
  }
}
