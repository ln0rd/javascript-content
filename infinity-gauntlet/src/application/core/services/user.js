import R from 'ramda'
import Promise from 'bluebird'
import {
  encryptPassword,
  checkPassword,
  encryptPasswordV2,
  checkPasswordV2
} from 'application/core/helpers/password'
import User from 'application/core/models/user'
import frameworkConfig from 'framework/core/config'
import Company from 'application/core/models/company'
import { translate } from 'framework/core/adapters/i18n'
import uniqueId from 'application/core/helpers/unique-id'
import { validate } from 'framework/core/adapters/validator'
import { userResponder } from 'application/core/responders/user'
import { s3GetHashboardFile } from 'application/core/helpers/aws'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import { isCpf, isCnpj } from 'application/core/helpers/document-number'
import { createIdwallReport } from 'application/core/integrations/idwall'
import ValidationError from 'framework/core/errors/validation-error'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'
import ExpiredTokenError from 'framework/core/errors/expired-token-error'
import UserAlreadyActiveError from 'application/core/errors/user-already-active-error'
import InvalidUserMetadataError from 'application/core/errors/invalid-user-metadata-error'
import InvalidDocumentNumberError from 'application/core/errors/invalid-document-number-error'
import InvalidUserValidationStatusError from 'application/core/errors/invalid-user-validation-status-error'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'
import UserNotBelongToCompany from 'application/core/errors/user-not-belong-to-company-error'
import UserEmailAlreadyExistsError from 'application/core/errors/user-email-already-exists-error'
import UserSaveError from 'application/core/errors/user-save-error'
import PortfolioService from 'application/core/services/portfolio'
import CompanyService from './company'
import createLogger from 'framework/core/adapters/logger'
import sms from '@hashlab/sms-client'
import config from 'application/core/config'
import moment from 'moment-timezone'
import UserInviteCompanyPermissionError from '../errors/user-invite-company-error'
import * as userValidationStatus from 'application/core/domain/user-validation-status'

const Logger = createLogger({
  name: 'USER_SERVICE'
})

function fromEntries(iterable) {
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val
    return obj
  }, {})
}
export default class UserService {
  static getUser(locale, userId, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(get)
      .tap(checkUser)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_user_get_user', {
        id: userId
      })

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return User.findOne({
        _id: userId
      })
        .elemMatch('permissions', { company_id: companyId })
        .lean()
        .exec()
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static inviteUser(locale, params, companyId) {
    return Promise.resolve()
      .tap(checkParams)
      .then(getCompany)
      .tap(checkCompany)
      .tap(applyDefaults)
      .then(getUser)
      .spread(createOrUpdate)

    function checkParams() {
      const Errors = validate('request_user_invite', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function getCompany() {
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

    function applyDefaults(company) {
      if (!R.has('name', params)) {
        params.name = company.name
      }

      if (!R.has('permission', params)) {
        params.permission = 'read_only'
      }
    }

    function getUser(company) {
      return [
        company,
        User.findOne({
          email: params.email
        })
      ]
    }

    function createOrUpdate(company, user) {
      if (user) {
        return Promise.resolve().then(checkMembership)
      } else {
        return Promise.resolve()
          .tap(checkUserMetadata)
          .then(createUser)
          .tap(createPortfolio)
          .tap(updateCompany)
          .then(activate)
          .then(respond)
      }

      function activate(user) {
        return UserService.activateUser(locale, {
          token: user.activation_token,
          password: params.password
        }).then(() => user)
      }

      function checkUserMetadata() {
        if (R.has('user_metadata', params)) {
          R.map(obj => {
            if (R.is(Object, obj)) {
              throw new InvalidUserMetadataError(locale)
            }
          }, params.user_metadata)
        }
      }

      function createUser() {
        return User.create({
          name: params.name,
          email: params.email,
          status: 'pending_confirmation',
          document_number: params.document_number || '',
          user_metadata: params.user_metadata || {},
          phone_number: params.phone_number || null,
          activation_token: uniqueId(),
          permissions: [
            {
              company_id: companyId,
              permission: params.permission
            }
          ]
        })
      }

      function createPortfolio(user) {
        return PortfolioService.create({
          name: `Meu portfolio: ${user.name}`,
          owner: {
            _id: user._id,
            name: user.name
          }
        })
      }

      async function updateCompany(user) {
        company.users.push(user._id)

        try {
          return await company.save()
        } catch (err) {
          Logger.error(
            {
              err,
              userId: user._id,
              companyId: company._id
            },
            'company-user-permission-error'
          )
          throw new UserInviteCompanyPermissionError(locale, err)
        }
      }

      function checkMembership() {
        if (!R.includes(user._id, company.users)) {
          return Promise.resolve()
            .then(checkUserPermissionAndUpdate)
            .tap(updateCompany)
            .then(respond)
        } else {
          return {
            message: translate('invite.user_already_belong_to_company', locale)
          }
        }

        function checkUserPermissionAndUpdate() {
          const permission = user.permissions.find(
            obj =>
              obj.company_id === company.id &&
              obj.permission === params.permission
          )
          if (permission) {
            return Promise.resolve(user)
          }
          user.permissions.push({
            company_id: company.id,
            permission: params.permission
          })
          return user.save()
        }
      }
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static activateUser(locale, params) {
    return Promise.resolve()
      .then(checkParams)
      .then(get)
      .tap(checkUser)
      .tap(checkStatus)
      .then(update)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_user_activate', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return User.findOne({
        activation_token: params.token
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }
    }

    function checkStatus(user) {
      if (user.status !== 'pending_confirmation') {
        throw new UserAlreadyActiveError(locale)
      }
    }

    function update(user) {
      user.status = 'active'
      user.activation_token = null
      user.last_info_update = moment().format('YYYY-MM-DD')
      user.password_hash = encryptPassword(params.password)
      user.password_bcrypt_defined_by_user = true

      return user.save()
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static async updateUser(locale, params, userId, companyId) {
    const [user, company] = await Promise.all([
      User.findById(userId),
      Company.findById(companyId)
        .select('users primary')
        .lean()
        .exec()
    ])

    const checkUserEditPermission = async (user, company) => {
      const companyUsers = (company.users || []).map(objectId =>
        objectId.toString()
      )

      if (!user) {
        Logger.info({ context: { userId, companyId } }, 'user-not-found')
        return false
      }

      const userIdStr = user._id.toString()

      if (companyUsers.includes(userIdStr)) {
        Logger.info(
          { context: { userId: userIdStr, companyId: company._id } },
          'user-included-in-company'
        )
        return true
      }

      if (company.primary && !company.parent_id) {
        const companyIds = (user.permissions || []).map(
          permission => permission.company_id
        )

        // Get companies that user has permission
        const userCompanies = await Company.find({
          _id: {
            $in: companyIds
          },
          parent_id: company._id.toString()
        })
          .select('users')
          .lean()
          .exec()

        // Get all users from all companies that user has permission
        const merchantUsers = userCompanies
          .map(company =>
            (company.users || []).map(userId => userId.toString())
          )
          .reduce((arrRoot, userList) => arrRoot.concat(userList), [])

        // if user its included in that list, allow edit
        if (merchantUsers.includes(userIdStr)) {
          Logger.info(
            { context: { userId: userIdStr, companyId: company._id } },
            'user-included-merchant-in-company'
          )
          return true
        }
      }

      return false
    }

    const hasEditPermission = await checkUserEditPermission(user, company)

    if (!hasEditPermission) {
      throw new ModelNotFoundError(locale, translate('models.user', locale))
    }

    // clean null and undefined params
    params = fromEntries(
      Object.entries(params).filter(([, value]) => {
        return !(value === null || value === undefined)
      })
    )
    const Errors = validate('user', params, { checkRequired: false })

    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const { email, document_number, name, phone_number, user_metadata } = params

    if (email) {
      const existingUser = await User.findOne({
        email
      })
        .select('_id')
        .lean()
        .exec()

      if (existingUser && `${existingUser._id}` !== userId) {
        throw new UserEmailAlreadyExistsError(locale)
      }

      user.email = email
    }

    if (document_number) {
      const documentNumber = document_number.replace(/[^0-9]/g, '')

      if (isCpf(documentNumber)) {
        user.document_type = 'cpf'
      } else if (isCnpj(documentNumber)) {
        user.document_type = 'cnpj'
      } else {
        throw new InvalidDocumentNumberError(locale, document_number)
      }
      user.document_number = documentNumber
    }

    user.name = name || user.name
    user.phone_number = phone_number || user.phone_number

    if (user_metadata) {
      Object.entries(user_metadata).forEach(([, value]) => {
        const type = typeof value
        if (type === 'function' || type === 'object') {
          Logger.error({ context: { user_metadata } }, 'user_metadata-invalid')
          throw new InvalidUserMetadataError(locale)
        }
      })

      user.user_metadata = Object.assign({}, user.user_metadata, user_metadata)
    }

    if (email || phone_number) {
      user.last_info_update = moment().format('YYYY-MM-DD')
    }

    const userSaved = await user.save()

    return userResponder(userSaved)
  }

  static async onboardingValidation(locale, userId, params) {
    const Errors = validate('request_user_onboarding_validation', params)
    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const user = await User.findOne({ _id: userId })
    if (!user) {
      throw new ModelNotFoundError(locale, translate('models.user', locale))
    }

    // Only allow users with validation_status 'pending' and 'inconclusive' to proceed
    const allowedStatuses = [
      userValidationStatus.PENDING,
      userValidationStatus.INCONCLUSIVE
    ]
    if (!allowedStatuses.includes(user.validation_status)) {
      throw new InvalidUserValidationStatusError(locale)
    }

    const body = {
      matriz: params.matrix_name,
      parametros: { token_sdk: params.sdk_token },
      reference_id: user._id.toString()
    }
    await createIdwallReport(locale, body)

    user.validation_status = userValidationStatus.PROCESSING
    try {
      return await user.save()
    } catch (err) {
      Logger.error({ err, user_id: user._id }, 'user-save-error')
      throw new UserSaveError(locale, err)
    }
  }

  static async updateValidationStatus(locale, userId, params) {
    const Errors = validate('request_user_update_validation_status', params)
    if (Errors) {
      throw new ValidationError(locale, Errors)
    }

    const user = await User.findOne({ _id: userId })
    if (!user) {
      throw new ModelNotFoundError(locale, translate('models.user', locale))
    }

    user.validation_status = params.validation_status
    try {
      await user.save()
    } catch (err) {
      Logger.error({ err, user_id: user._id }, 'user-save-error')
      throw new UserSaveError(locale, err)
    }

    return userResponder(user)
  }

  static disableUser(locale, userId, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkUser)
      .then(disable)
      .then(respond)

    function get() {
      return User.findOne({
        _id: userId
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }

      return Promise.resolve()
        .then(getCompany)
        .tap(checkCompany)

      function getCompany() {
        return Company.findOne({
          _id: companyId,
          users: {
            $in: [userId]
          }
        })
          .lean()
          .exec()
      }

      function checkCompany(company) {
        if (!company) {
          throw new UserNotBelongToCompany(locale)
        }
      }
    }

    function disable(user) {
      user.status = 'disabled'

      return user.save()
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static enableUser(locale, userId, companyId) {
    return Promise.resolve()
      .then(get)
      .tap(checkUser)
      .then(enable)
      .then(respond)

    function get() {
      return User.findOne({
        _id: userId,
        status: 'disabled'
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }

      return Promise.resolve()
        .then(getCompany)
        .tap(checkCompany)

      function getCompany() {
        return Company.findOne({
          _id: companyId,
          users: {
            $in: [userId]
          }
        })
          .lean()
          .exec()
      }

      function checkCompany(company) {
        if (!company) {
          throw new UserNotBelongToCompany(locale)
        }
      }
    }

    function enable(user) {
      user.status = 'active'

      return user.save()
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static sendPasswordResetLink(locale, params) {
    return Promise.resolve()
      .then(checkParams)
      .then(get)
      .tap(checkUser)
      .then(update)
      .tap(sendEmail)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_user_send_password_reset_link', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return User.findOne({
        email: params.email
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }
    }

    function update(user) {
      user.reset_password_token = uniqueId()

      return user.save()
    }

    function sendEmail() {
      // TODO send email with queue
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static resetPassword(locale, params) {
    return Promise.resolve()
      .then(checkParams)
      .then(get)
      .tap(checkUser)
      .then(update)
      .tap(sendEmail)
      .then(respond)

    function checkParams() {
      const Errors = validate('request_user_reset_password', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return User.findOne({
        reset_password_token: params.token
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }
    }

    function update(user) {
      user.reset_password_token = null
      user.password_hash = encryptPassword(params.password)
      user.password_bcrypt_defined_by_user = true

      return user.save()
    }

    function sendEmail(user) {
      return Promise.resolve()
        .then(findCompany)
        .then(findParent)
        .then(scheduleEmail)

      function findCompany() {
        const Permission = user.permissions[0]

        if (!Permission) {
          return
        }

        return Company.findOne({
          _id: Permission.company_id
        })
          .lean()
          .exec()
      }

      function findParent(company) {
        if (!company) {
          return
        }

        if (!R.has('parent_id', company)) {
          return
        }

        return Company.findOne({
          _id: company.parent_id
        })
          .lean()
          .exec()
      }

      function scheduleEmail(parentCompany) {
        const EmailParams = {
          user,
          user_password: params.password,
          parent_name: translate(
            'mailer.user_reset_password.support_team',
            locale
          ),
          parent_contact: translate(
            'mailer.user_reset_password.support_contact',
            locale
          )
        }

        if (parentCompany) {
          EmailParams.parent_name = parentCompany.name

          if (
            R.has('contact', parentCompany) &&
            R.has('phone', parentCompany.contact)
          ) {
            EmailParams.parent_contact = parentCompany.contact.phone
          }
        }

        return scheduleToDeliver(
          'base',
          'user-reset-password',
          frameworkConfig.mailer.from,
          [user.email],
          translate('mailer.user_reset_password.subject', locale),
          locale,
          EmailParams
        )
      }
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static updatePassword(locale, params, id, userId) {
    return Promise.resolve()
      .tap(checkSession)
      .tap(checkParams)
      .then(get)
      .tap(checkUser)
      .tap(checkCurrentPassword)
      .then(update)
      .then(respond)

    function checkSession() {
      if (id !== userId) {
        throw new UnauthenticatedError(locale, 'user_id')
      }
    }

    function checkParams() {
      const Errors = validate('request_user_update_password', params)

      if (Errors) {
        throw new ValidationError(locale, Errors)
      }
    }

    function get() {
      return User.findOne({
        _id: id
      })
    }

    function checkUser(user) {
      if (!user) {
        throw new ModelNotFoundError(locale, translate('models.user', locale))
      }
    }

    function checkCurrentPassword(user) {
      if (!checkPassword(user.password_hash, params.current_password)) {
        throw new InvalidParameterError(locale, 'current_password')
      }
    }

    function update(user) {
      user.password_hash = encryptPassword(params.new_password)
      user.password_bcrypt_defined_by_user = true
      return user.save()
    }

    function respond(user) {
      return userResponder(user)
    }
  }

  static createCredentials(locale, params) {
    return encryptPasswordV2(params.password)
  }

  static checkPassword(locale, params) {
    return Promise.resolve()
      .then(checkPassword)
      .then(respond)

    function checkPassword() {
      return checkPasswordV2(params.hash, params.password)
    }

    function respond(response) {
      return {
        show: response
      }
    }
  }

  static async removePermission(locale, companyId, userId) {
    Logger.info(
      {
        companyId: companyId,
        user: userId
      },
      'remove-user-permission-request'
    )

    let user = await User.findOne({ _id: userId })
      .select('permissions')
      .exec()

    if (!user) {
      Logger.error(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-permission-user-not-found'
      )

      throw new ModelNotFoundError(locale, translate('models.user', locale))
    }

    if (!user.permissions) {
      Logger.info(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-permission-no-permissions'
      )

      return userResponder(user)
    }

    const permissionIndex = user.permissions.findIndex(
      permission => permission.company_id === companyId
    )

    if (permissionIndex < 0) {
      Logger.info(
        {
          companyId: companyId,
          user: userId
        },
        'remove-user-permission-not-found'
      )

      return userResponder(user)
    }

    user.permissions.splice(permissionIndex, 1)

    user = await user.save()
    await CompanyService.removeUserFromCompany(locale, companyId, userId)

    Logger.info(
      {
        companyId: companyId,
        user: userId
      },
      'remove-user-permission-success'
    )

    return userResponder(user)
  }

  static async applyPasswordResetToken(locale, params, create) {
    async function generateResetURL(token) {
      try {
        const targetHostname = new URL(params.target).hostname
        const urlMap = await s3GetHashboardFile('config/url.index.json')
        const path = '/#!/page/password-reset/'

        if (targetHostname in urlMap) {
          return `https://${targetHostname}${path}${token}`
        }

        const isoKey = targetHostname.split('.')[0]

        if (isoKey in urlMap) {
          return `https://${isoKey}.hashboard.hash.com.br${path}${token}`
        }
      } catch (e) {
        return
      }
    }

    function getUser() {
      const query = {
        status: 'active'
      }

      if (params.document_number) {
        query.document_number = params.document_number.replace(/\D/g, '')
      } else if (params.email) {
        query.email = params.email
      } else {
        return
      }

      return User.findOne(query)
        .select('name email phone_number permissions')
        .lean()
        .exec()
    }

    async function getParentCompany(user) {
      const companyId = user.permissions[0].company_id
      const company = await Company.findOne({
        _id: companyId
      })
        .select('parent_id name contact')
        .lean()
        .exec()

      if (!company) {
        return
      }

      if (company.parent_id) {
        return Company.findOne({
          _id: company.parent_id
        })
          .select('name contact')
          .lean()
          .exec()
      }

      return company
    }

    async function applyResetToken(user, token) {
      return User.updateOne(
        { _id: user._id },
        {
          $set: {
            reset_password_token: token,
            reset_password_token_expires_at: moment()
              .tz(config.timezone)
              .add(4, 'hours')
          }
        }
      )
    }

    async function sendMessage(user, link, parentCompany) {
      if (params.recovery_method === 'email') {
        const emailConfig = {
          link,
          parentName: translate(
            'mailer.user_reset_password.support_team',
            locale
          ),
          parentContact: translate(
            'mailer.user_reset_password.support_contact',
            locale
          )
        }

        return scheduleToDeliver(
          'base',
          create ? 'user-create-password' : 'user-reset-password-v2',
          frameworkConfig.mailer.from,
          [user.email],
          translate('mailer.user_reset_password.subject', locale),
          locale,
          emailConfig
        )
      }

      const client = sms.createSmsClient(config.services.sms_endpoint)
      const message = translate(
        create ? 'sms.password_create' : 'sms.password_reset_v2',
        locale,
        {
          companyName: parentCompany.name,
          link
        }
      )

      if (!user.phone_number) {
        Logger.info(
          { userId: `${user._id}` },
          create
            ? 'create-password-token-creation-no-phone'
            : 'reset-password-token-creation-no-phone'
        )
        return
      }

      const fullNumber = user.phone_number.startsWith('+55')
        ? user.phone_number
        : `+55${user.phone_number}`

      return client.sendSms(message, fullNumber)
    }

    const operation = create
      ? 'create-password-token-creation'
      : 'reset-password-token-creation'

    Logger.info({ params }, operation)

    // O payload da criação e reset de senha são iguais
    const validationErrors = validate('request_password_reset_token', params)

    if (validationErrors) {
      throw new ValidationError(locale, validationErrors)
    }

    const resetToken = uniqueId()
    const resetUrl = await generateResetURL(resetToken)

    if (!resetUrl) {
      throw new UnauthorizedError(locale)
    }

    try {
      const user = await getUser()

      if (!user || !user.permissions || user.permissions.length === 0) {
        return
      }

      const parentCompany = await getParentCompany(user)
      await applyResetToken(user, resetToken)
      await sendMessage(user, resetUrl, parentCompany)
      Logger.info(
        { userId: user._id, params },
        create
          ? 'create-password-token-creation-success'
          : 'reset-password-token-creation-success'
      )
    } catch (err) {
      Logger.error(
        { err, params },
        create
          ? 'create-password-token-creation'
          : 'reset-password-token-creation'
      )
    }
    return
  }

  static async resetPasswordViaToken(locale, params) {
    const validationErrors = validate('request_user_activate', params)
    if (validationErrors) {
      throw new ValidationError(locale, validationErrors)
    }

    if (!params.token) {
      throw new InvalidParameterError(locale, 'token')
    }

    try {
      const user = await User.findOne({
        reset_password_token: params.token
      }).exec()

      if (!user) {
        Logger.warn(
          { token: params.token },
          'reset_password_token_already_used_or_invalid'
        )
        throw new ExpiredTokenError(locale)
      }

      const expirationDate = moment(user.reset_password_token_expires_at).tz(
        config.timezone
      )
      const now = moment().tz(config.timezone)

      if (expirationDate < now) {
        Logger.warn({ token: params.token }, 'reset_password_expired_token')
        throw new ExpiredTokenError(locale)
      }

      user.password_hash = encryptPassword(params.password)
      user.password_bcrypt_defined_by_user = true
      user.reset_password_token = ''
      user.reset_password_token_expires_at = undefined
      await user.save()
      Logger.info({ userId: user._id }, 'reset-password-success')
    } catch (err) {
      Logger.error({ err, token: params.token }, 'reset_password')
      if (err instanceof ExpiredTokenError) {
        throw err
      }
      return
    }
  }
}
