import R from 'ramda'
import moment from 'moment'
import Promise from 'bluebird'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import { flattenObj } from 'application/core/helpers/utils'
import { validate } from 'framework/core/adapters/validator'
import createLogger from 'framework/core/adapters/logger'
import Connector from 'application/core/providers/connector'
import Affiliation from 'application/core/models/affiliation'
import Hardware from 'application/core/models/capture-hardware'
import { paginate } from 'application/core/helpers/pagination'
import ValidationError from 'framework/core/errors/validation-error'
import { isProviderAllowed } from 'application/core/helpers/provider'
import { hardwareResponder } from 'application/core/responders/hardware'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ProviderNotAllowedError from 'application/core/errors/provider-not-allowed-error'
import AffiliationDisabledError from 'application/core/errors/affiliation-disabled-error'
import DisableSoftwareProviderError from 'application/core/errors/disable-software-provider-error'
import CompanyNotBelongToParentError from 'application/core/errors/company-not-belong-to-parent-error'
import SerialNumberAlreadyExistsError from 'application/core/errors/serial-number-already-exists-error'
import InvalidHardwareSerialNumberError from 'application/core/errors/invalid-hardware-serial-number'
import mongoose from 'mongoose'
import { verifySerialNumber } from 'application/core/helpers/hardware'
import sendWebHook from 'application/webhook/helpers/deliverer'
import * as CompanyStatus from 'application/core/domain/company-status'

const Logger = createLogger({ name: 'HARDWARE_SERVICE' })
export default class HardwareService {
  static getHardwares(locale, params, companyId) {
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
          ['status', 'provider', 'serial_number', 'terminal_model'],
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
        Hardware,
        query,
        {
          created_at: 'desc'
        },
        params.page,
        params.count,
        hardwareResponder
      )
    }

    function respond(response) {
      return response
    }
  }

  static getHardware(locale, hardwareId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkHardware)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_hardware_get_hardware', {
        id: hardwareId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return Hardware.findOne({
        _id: hardwareId,
        company_id: companyId
      })
        .lean()
        .exec()
    }

    function checkHardware(hardware) {
      if (!hardware) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hardware', locale)
        )
      }
    }

    function respond(hardware) {
      return hardwareResponder(hardware)
    }
  }

  static getChildrenHardwares(locale, params, companyId) {
    return Promise.resolve()
      .then(formatCompanyQuery)
      .then(findCompanies)
      .then(findHardwares)

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

    function findHardwares(companies) {
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
          ['status', 'provider', 'serial_number', 'terminal_model'],
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
        .then(formatHardwaresQuery)
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

      function formatHardwaresQuery() {
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
            return hardwareResponder(model)
          }
        }

        return paginate(
          locale,
          Hardware,
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

  static activateSerial(locale, params) {
    return Promise.resolve()
      .then(checkParams)
      .then(findHardware)
      .tap(checkHardware)
      .then(findCompany)
      .spread(respond)

    function checkParams() {
      const Errors = validate('request_activate_serial', params, {
        checkRequired: true
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      const Query = {
        serial_number: params.serial_number,
        status: 'active'
      }

      return Query
    }

    function findHardware(query) {
      return Hardware.findOne(query)
        .lean()
        .exec()
    }

    function checkHardware(hardware) {
      if (!hardware) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hardware', locale)
        )
      }
    }

    function findCompany(hardware) {
      return [
        Company.findOne({
          _id: hardware.company_id
        })
          .lean()
          .exec(),
        hardware
      ]
    }

    function respond(company, hardware) {
      return {
        company_id: company._id,
        company_name: company.name,
        provider: hardware.provider,
        hash_key: company.hash_key,
        serial_number: params.serial_number,
        company_document_number: company.document_number,
        company_address: company.address,
        company_metadata: company.company_metadata
      }
    }
  }

  static disableChild(locale, hardwareId, childId, companyId) {
    return Promise.resolve()
      .then(getChildCompany)
      .tap(checkChildCompany)
      .then(getHardware)
      .tap(checkHardware)
      .then(disableSoftwareProvider)
      .then(disableHardware)
      .tap(sendTerminalDisabledWebhook)
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
        throw new ModelNotFoundError(
          locale,
          translate('models.company', locale)
        )
      }
    }

    function getHardware(childCompany) {
      return Hardware.findOne({
        _id: hardwareId,
        company_id: childCompany._id
      })
    }

    function checkHardware(hardware) {
      if (!hardware) {
        throw new ModelNotFoundError(
          locale,
          translate('models.hardware', locale)
        )
      }
    }

    function disableSoftwareProvider(hardware) {
      if (
        !hardware.software_provider ||
        hardware.software_provider === 'none'
      ) {
        return hardware
      }

      return Promise.resolve()
        .then(findAffiliation)
        .then(disableHardwareOnProvider)
        .tap(checkResult)
        .then(respond)

      function findAffiliation() {
        return Promise.resolve()
          .then(findAffiliation)
          .tap(checkAffiliation)

        function findAffiliation() {
          const query = {
            company_id: companyId,
            enabled: true,
            provider: hardware.provider
          }
          return Affiliation.findOne(query)
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
      }

      function disableHardwareOnProvider(affiliation) {
        const Provider = Connector(locale, hardware.software_provider)
        return Provider.disableHardware(hardware, affiliation.security_key)
      }

      function checkResult(response) {
        if (!response.success) {
          throw new DisableSoftwareProviderError(
            locale,
            hardware.software_provider
          )
        }
      }

      function respond() {
        return hardware
      }
    }

    function disableHardware(hardware) {
      hardware.status = 'disabled'

      return hardware.save()
    }

    function sendTerminalDisabledWebhook(hardware) {
      return sendWebHook(
        companyId, // this actually is the parent_id
        'terminal_disabled',
        'capturehardware',
        hardware._id,
        'active',
        hardware.status,
        hardwareResponder(hardware)
      )
    }

    function respond(hardware) {
      return hardwareResponder(hardware)
    }
  }

  static create(locale, params, companyId) {
    // Set objectid early, this is necessary for hash_capture software_provider
    params._id = mongoose.Types.ObjectId()

    // Force software_provider === 'hash_capture' for
    // hardware_provider === 'pax' and ['d195', 'd190', 'd175'].includes(params.terminal_model)
    if (
      params.hardware_provider === 'pax' &&
      ['d195', 'd190', 'd175'].includes(params.terminal_model)
    ) {
      params.software_provider = 'hash_capture'
    }

    // FIXME: 2021-07-08 this promise may need some refactoring
    // This holds the current company document we are creating the hardware for.
    // Underscore is used to raise attention to the issue
    let _Company
    return Promise.resolve()
      .then(getCompany)
      .tap(checkCompany)
      .tap(checkParams)
      .then(getHardwareBySerial)
      .tap(checkHardware)
      .then(sendToProvider)
      .tap(validateProviderStatus)
      .then(sendToSoftwareProvider)
      .tap(checkSoftwareProvider)
      .then(createHardware)
      .tap(sendTerminalEnabledWebhook)
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
      } else {
        _Company = company
      }
    }

    function checkParams(company) {
      if (!R.has('software_provider', params)) {
        params.software_provider = 'none'
      }

      if (
        !R.has('provider', params) &&
        R.has('default_payment_provider', company)
      ) {
        params.provider = company.default_payment_provider
      } else if (!R.has('provider', params)) {
        params.provider = 'stone'
      }

      const Errors = validate('capture_hardware', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }

      if (!isProviderAllowed(locale, params.provider)) {
        throw new ProviderNotAllowedError(locale, params.provider)
      }

      // Force uppercase serial number
      params.serial_number = params.serial_number.toUpperCase()

      // Verify if the serial number is from that hardware model
      if (!verifySerialNumber(params.serial_number, params.terminal_model)) {
        throw new InvalidHardwareSerialNumberError(locale)
      }
    }

    function getHardwareBySerial() {
      if (!R.has('serial_number', params)) {
        return
      }

      return Hardware.findOne({
        serial_number: params.serial_number,
        status: { $ne: 'disabled' }
      })
        .lean()
        .exec()
    }

    function checkHardware(hardware) {
      if (hardware) {
        throw new SerialNumberAlreadyExistsError(locale)
      }
    }

    async function sendToProvider() {
      const Provider = Connector(locale, params.provider)
      const affiliation = await findAndCheckAffiliation().catch(error => {
        throw error
      })
      return Provider.registerHardware(params, affiliation)

      async function findAndCheckAffiliation() {
        const affiliation = await Affiliation.findOne({
          company_id: companyId,
          provider: params.provider
        })
          .lean()
          .exec()

        if (!affiliation) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }

        if (affiliation.enabled) {
          return affiliation
        }

        switch (_Company.statusV2) {
          case CompanyStatus.PENDING:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_pending', locale)
            )
          case CompanyStatus.REJECTED:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_rejected', locale)
            )
          case CompanyStatus.CANCELED:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_canceled', locale)
            )
          case CompanyStatus.BLOCKED:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_blocked', locale)
            )
          case CompanyStatus.REVOKED:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_revoked', locale)
            )
          case CompanyStatus.INACTIVE:
            throw new AffiliationDisabledError(
              locale,
              translate('errors.company_status_inactive', locale)
            )
          default:
            throw new AffiliationDisabledError(locale, '')
        }
      }
    }

    function validateProviderStatus(providerHardware) {
      if (R.has('status', providerHardware)) {
        params.status = providerHardware.status
      }
    }

    function sendToSoftwareProvider() {
      if (
        params.software_provider === 'none' ||
        !R.has('software_provider', params)
      ) {
        return
      }

      const SoftwareProvider = Connector(locale, params.software_provider)

      Logger.info({ params }, 'software-provider-hadrware-register-started')

      return Promise.resolve()
        .then(getCompany)
        .tap(checkCompany)
        .then(findAffiliation)
        .spread(findAffiliationOnParent)
        .spread(registerOnSoftwareProvider)

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

      function findAffiliation(company) {
        return [
          company,
          Affiliation.findOne({
            company_id: companyId,
            enabled: true,
            provider: params.provider
          })
            .lean()
            .exec()
        ]
      }

      function findAffiliationOnParent(company, affiliation) {
        if (affiliation) {
          return [company, affiliation]
        }

        if (!affiliation && !R.has('parent_id', company)) {
          throw new ModelNotFoundError(
            locale,
            translate('models.affiliation', locale)
          )
        }

        return Promise.resolve()
          .then(getParentAffiliation)
          .tap(checkAffiliation)
          .then(respond)

        function getParentAffiliation() {
          return Affiliation.findOne({
            company_id: company.parent_id,
            enabled: true,
            provider: params.provider
          })
            .lean()
            .exec()
        }

        function checkAffiliation(parentAffiliation) {
          if (!parentAffiliation) {
            throw new ModelNotFoundError(
              locale,
              translate('models.affiliation', locale)
            )
          }
        }

        function respond(parentAffiliation) {
          return [company, parentAffiliation]
        }
      }

      function registerOnSoftwareProvider(company, affiliation) {
        // 2021-01-06 - Estanislau
        // Company ID is needed to call `HashCaptureProvider.disableHardware`
        // when HW being registered is linked at Celer and must be unlinked
        // to retry.
        params.company_id = companyId

        return SoftwareProvider.registerHardware(
          params,
          affiliation,
          company,
          affiliation.security_key
        )
      }
    }

    function checkSoftwareProvider(softwareProviderHardware) {
      if (
        softwareProviderHardware &&
        R.has('logical_number', softwareProviderHardware)
      ) {
        params.logical_number = softwareProviderHardware.logical_number
      }
    }

    function createHardware() {
      return Hardware.create(params)
    }

    async function sendTerminalEnabledWebhook(hardware) {
      if (hardware.status === 'active') {
        await sendWebHook(
          _Company.parent_id,
          'terminal_enabled',
          'capturehardware',
          hardware._id,
          'pending_activation',
          hardware.status,
          hardwareResponder(hardware)
        )
      }
    }

    function respond(hardware) {
      return hardwareResponder(hardware)
    }
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
