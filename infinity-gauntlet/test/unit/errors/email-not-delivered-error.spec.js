import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import EmailNotDeliveredError from 'framework/core/errors/email-not-delivered-error'

describe('Unit => Errors: EmailNotDeliveredError', function() {
  it("should have a property 'name' equals to 'EmailNotDeliveredError'", function() {
    expect(
      new EmailNotDeliveredError(
        frameworkConfig.core.i18n.defaultLocale,
        new Error('Test')
      )
    ).to.have.property('name', 'EmailNotDeliveredError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new EmailNotDeliveredError(
        frameworkConfig.core.i18n.defaultLocale,
        new Error('Test')
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 400", function() {
    expect(
      new EmailNotDeliveredError(
        frameworkConfig.core.i18n.defaultLocale,
        new Error('Test')
      )
    ).to.have.property('statusCode', 400)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.email_not_delivered',
    frameworkConfig.core.i18n.defaultLocale,
    'Test'
  )}'`, function() {
    expect(
      new EmailNotDeliveredError(
        frameworkConfig.core.i18n.defaultLocale,
        new Error('Test')
      )
    ).to.have.property(
      'message',
      translate(
        'errors.email_not_delivered',
        frameworkConfig.core.i18n.defaultLocale,
        'Test'
      )
    )
  })
})
