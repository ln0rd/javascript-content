import R from 'ramda'
import { join } from 'path'
import Promise from 'bluebird'
import nunjucks from 'nunjucks'
import nodemailer from 'nodemailer'
import config from 'application/core/config'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import sendgridTransport from 'nodemailer-sendgrid-transport'
import { publishMessage } from 'framework/core/adapters/queue'
import EmailNotDeliveredError from 'framework/core/errors/email-not-delivered-error'

let Client = nodemailer.createTransport(
  sendgridTransport({ auth: frameworkConfig.mailer.credentials })
)

if (process.env.NODE_ENV === 'test') {
  Client = nodemailer.createTransport({
    jsonTransport: true
  })
}

export function scheduleToDeliver(
  layout,
  template,
  from,
  email,
  subject,
  locale,
  metadata = {},
  attachments = []
) {
  return Promise.resolve()
    .then(getParams)
    .then(publishToQueue)

  function getParams() {
    return {
      layout: layout,
      template: template,
      from: from,
      email: email,
      subject: subject,
      locale: locale,
      metadata: metadata,
      attachments
    }
  }

  function publishToQueue(params) {
    return publishMessage('Mailer', Buffer.from(JSON.stringify(params)))
  }
}

export function sendEmail(
  layout,
  template,
  from,
  email,
  subject,
  locale,
  metadata = {},
  attachments = []
) {
  return Promise.resolve()
    .tap(configureTemplate)
    .then(getTemplate)
    .spread(send)
    .catch(errorHandler)

  function configureTemplate() {
    nunjucks.configure(
      join(frameworkConfig.root_path, 'src', 'application', 'mailer'),
      { autoescape: true }
    )
  }

  function getTemplate() {
    const MailMetadata = R.merge(
      {
        _t: translate,
        _layout: `layouts/${layout}.html`,
        _config: config,
        _frameworkConfig: frameworkConfig
      },
      metadata
    )

    return Promise.resolve()
      .then(getTxtTemplate)
      .then(getHtmlTemplate)

    function getTxtTemplate() {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        return nunjucks.render(
          `${template}.txt`,
          MailMetadata,
          (err, result) => {
            if (err) {
              return reject(err)
            }

            return resolve(result)
          }
        )
      })
    }

    function getHtmlTemplate(contentTxt) {
      // eslint-disable-next-line promise/avoid-new
      return new Promise((resolve, reject) => {
        return nunjucks.render(
          `${template}.html`,
          MailMetadata,
          (err, result) => {
            if (err) {
              return reject(err)
            }

            return resolve([contentTxt, result])
          }
        )
      })
    }
  }

  function send(contentTxt, contentHtml) {
    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      Client.sendMail(
        {
          from: from,
          to: email,
          subject: subject,
          text: contentTxt,
          html: contentHtml,
          attachments: attachments
        },
        function(err, info) {
          if (err) {
            return reject(err)
          }

          return resolve(info)
        }
      )
    })
  }

  function errorHandler(err) {
    throw new EmailNotDeliveredError(locale, err)
  }
}
