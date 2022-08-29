import Promise from 'bluebird'
import createLogger from 'framework/core/adapters/logger'
import { scheduleToDeliver } from 'framework/core/helpers/mailer'
import { translate } from 'framework/core/adapters/i18n'
import frameworkConfig from 'framework/core/config'
import Company from 'application/core/models/company'
import User from 'application/core/models/user'

const Logger = createLogger({ name: 'MANUAL_ACTIVATION_USER_MAIL_TASK' })

export default class ManualActivationUserMail {
  static type() {
    return 'manual'
  }

  static handler(paramList) {
    const userMail = paramList[0]
    const email = paramList[1]

    return Promise.all([email, userMail])
      .spread(getUser)
      .spread(getCompany)
      .spread(getParentCompany)
      .spread(sendEmail)
      .then(log)
      .catch(err => Logger.error({ err }, 'activationUserMailError'))
  }
}

function log() {
  Logger.info('mailSent')
}

function getUser(email, userMail) {
  Logger.info({ email, userMail }, 'activationUserMailGetUser')

  return [email, User.findOne({ email: userMail })]
}

function getCompany(email, user) {
  Logger.info({ user }, 'activationUserMailGetCompany')

  return [email, user, Company.findOne({ _id: user.permissions[0].company_id })]
}

function getParentCompany(email, user, company) {
  Logger.info({ company }, 'activationUserMailGetParentCompany')

  return [email, user, company, Company.findOne({ _id: company.parent_id })]
}

function sendEmail(email, user, company, parentCompany) {
  Logger.info({ parentCompany }, 'activationUserMailSendEmail')

  return scheduleToDeliver(
    'base',
    'activation-email',
    'noreply@hashlab.com.br',
    email,
    translate(
      'mailer.activation',
      frameworkConfig.core.i18n.defaultLocale,
      parentCompany.name
    ),
    frameworkConfig.core.i18n.defaultLocale,
    { user, company, parentCompany, user_password: '1234' }
  )
}
