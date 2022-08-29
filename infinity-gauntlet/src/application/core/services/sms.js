import User from 'application/core/models/user'
import Company from 'application/core/models/company'
import config from 'application/core/config'
import { translate } from 'framework/core/adapters/i18n'
import sms from '@hashlab/sms-client'
import uniqueId from 'application/core/helpers/unique-id'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import ValidationError from 'framework/core/errors/validation-error'
import InternalServerError from 'framework/core/errors/internal-server-error'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({
  name: 'IG_SMS_SERVICE'
})

export default class SmsService {
  static sendPasswordRecovery(locale, phoneNumber) {
    function getUser() {
      if (!phoneNumber) {
        throw new ValidationError(locale, {})
      }

      // This is a kludge and should be replaced by an actual
      // phone number parser. The idea here is just to remove
      // invalid phone number characters to avoid bogus input.
      //
      // However, dealing with phone numbers is much more complicated than this,
      // and this method is error-prone, especially if we eventually need to
      // handle international numbers.
      const number = phoneNumber.replace(/[^\d*+]+/g, '')

      return User.findOne(
        {
          phone_number: number
        },
        {
          reset_password_token: true,
          permissions: true
        }
      )
    }

    async function getCompanyName(companyId) {
      const { name } = await Company.findOne({
        _id: companyId
      })
        .select('name')
        .lean()
        .exec()

      return name
    }

    async function getParentCompanyId(companyId) {
      const company = await Company.findOne({
        _id: companyId
      })
        .select('parent_id')
        .lean()
        .exec()
      return company.parent_id || companyId
    }

    async function setToken(user) {
      const code = new Array(6)
        .fill(null)
        .map(() => (Math.random() * 10) | 0)
        .join('')

      try {
        await User.updateOne(
          {
            _id: user._id
          },
          {
            $set: {
              reset_password_token: code
            }
          }
        )
      } catch (err) {
        Logger.error({ err }, 'sms-code-creation-err')
        throw new InternalServerError(locale)
      }

      return code
    }

    async function getDisplayName(user) {
      try {
        const permission = user.permissions[user.permissions.length - 1]
        const companyId = permission.company_id
        const parentCompanyId = await getParentCompanyId(companyId)
        const parentCompanyName = await getCompanyName(parentCompanyId)
        return parentCompanyName
      } catch (ex) {
        Logger.warn({ ex }, 'send-sms-display-name-error')
        return 'App'
      }
    }

    async function sendSms() {
      const client = sms.createSmsClient(config.services.sms_endpoint)

      const user = await getUser()

      if (!user) {
        throw new ModelNotFoundError(locale, 'model.user')
      }

      const displayName = await getDisplayName(user)

      const code = await setToken(user)

      const message = translate('sms.recovery_code', locale, {
        companyName: displayName,
        code
      })

      // This code is very specific to Brazilian numbers
      // and the way we've been saving numbers in IG.
      //
      // If we ever need to support international numbers, we'll need
      // to save country codes.
      const fullNumber = phoneNumber.startsWith('+55')
        ? phoneNumber
        : `+55${phoneNumber}`

      return client.sendSms(message, fullNumber).catch(err => {
        Logger.error({ err, fullNumber }, 'send-sms-err')
        throw err
      })
    }

    return Promise.resolve().then(sendSms)
  }

  static validateCode(locale, phoneNumber, code) {
    function validateParams() {
      if (!phoneNumber || !code) {
        throw new ValidationError(locale, {})
      }

      return {
        phoneNumber,
        code
      }
    }

    async function validateCode({ phoneNumber, code }) {
      const user = await User.findOne(
        {
          phone_number: phoneNumber
        },
        {
          _id: true,
          phone_number: true,
          reset_password_token: true
        }
      )

      if (!user || user.reset_password_token !== code) {
        if (!user) {
          Logger.error({ phoneNumber }, 'sms-code-user-not-found')
        } else {
          Logger.error({ user }, 'sms-code-invalid')
        }
        throw new ModelNotFoundError(locale, 'model.user')
      }

      const newToken = uniqueId()
      await User.updateOne(
        {
          _id: user._id
        },
        {
          $set: { reset_password_token: newToken }
        }
      )

      return { token: newToken }
    }

    return Promise.resolve()
      .then(validateParams)
      .then(validateCode)
  }
}
