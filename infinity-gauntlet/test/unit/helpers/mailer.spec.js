import { expect } from 'chai'
import { renderTemplate } from 'test/helper'
import frameworkConfig from 'framework/core/config'
import { sendEmail } from 'framework/core/helpers/mailer'
import EmailNotDeliveredError from 'framework/core/errors/email-not-delivered-error'

describe('Unit => Helpers: Mailer', function() {
  context('when an error occurs and the email is not delivered', function() {
    it('should throw a EmailNotDeliveredError', function() {
      return sendEmail(
        'base',
        'non-existent-template',
        frameworkConfig.mailer.from,
        'john@example.com',
        'Testing mailer helper',
        frameworkConfig.core.i18n.defaultLocale,
        {
          testing: 'This is a test message'
        }
      ).catch(err => {
        return expect(err).to.be.an.instanceof(EmailNotDeliveredError)
      })
    })
  })

  context('when the email is delivered', function() {
    let messageData = {}

    before(function() {
      return sendEmail(
        'base',
        'test-template',
        frameworkConfig.mailer.from,
        'john@example.com',
        'Testing mailer helper',
        frameworkConfig.core.i18n.defaultLocale,
        {
          testing: 'This is a test message'
        },
        [
          {
            filename: 'file.csv',
            content: 'foo,bar\nbar,foo'
          }
        ]
      ).then(info => {
        return (messageData = JSON.parse(info.message))
      })
    })

    it(`should have property from.address equals to '${frameworkConfig.mailer.from.substr(
      9,
      23
    )}'`, function() {
      expect(messageData.from).to.have.property(
        'address',
        frameworkConfig.mailer.from.substr(9, 23)
      )
    })

    it(`should have property from.name equals to '${frameworkConfig.mailer.from.substr(
      0,
      7
    )}'`, function() {
      expect(messageData.from).to.have.property(
        'name',
        frameworkConfig.mailer.from.substr(0, 7)
      )
    })

    it(`should have property to[0].address equals to 'john@example.com'`, function() {
      expect(messageData.to[0]).to.have.property('address', 'john@example.com')
    })

    it(`should have property subject equals to 'Testing mailer helper'`, function() {
      expect(messageData).to.have.property('subject', 'Testing mailer helper')
    })

    it(`should have property message.text equals to 'This is a test message'`, function() {
      return renderTemplate('base', 'test-template.txt', {
        testing: 'This is a test message'
      }).then(content => {
        expect(messageData).to.have.property('text', content)
        return
      })
    })

    it(`should have property message.html equals to 'This is a test message'`, function() {
      return renderTemplate('base', 'test-template.html', {
        testing: 'This is a test message'
      }).then(content => {
        expect(messageData).to.have.property('html', content)
        return
      })
    })

    it(`should have property message.attachments`, () => {
      expect(messageData.attachments[0]).to.have.property(
        'filename',
        'file.csv'
      )
      expect(messageData.attachments[0]).to.have.property(
        'content',
        'foo,bar\nbar,foo'
      )
      expect(messageData.attachments[0]).to.have.property(
        'contentType',
        'text/csv'
      )
    })
  })
})
