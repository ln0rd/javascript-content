import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import StandardError from 'framework/core/errors/standard-error'

describe('Unit => Errors: StandardError', function() {
  it("should have a property 'name' equals to 'StandardError'", function() {
    expect(
      new StandardError(
        400,
        'errors.handlers.default',
        frameworkConfig.core.i18n.defaultLocale
      )
    ).to.have.property('name', 'StandardError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new StandardError(
        400,
        'errors.handlers.default',
        frameworkConfig.core.i18n.defaultLocale
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 400", function() {
    expect(
      new StandardError(
        400,
        'errors.handlers.default',
        frameworkConfig.core.i18n.defaultLocale
      )
    ).to.have.property('statusCode', 400)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.default',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new StandardError(
        400,
        'errors.handlers.default',
        frameworkConfig.core.i18n.defaultLocale
      )
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.default',
        frameworkConfig.core.i18n.defaultLocale
      )
    )
  })

  context('when without statusCode', function() {
    it("should have a property 'statusCode' equals to 500", function() {
      expect(
        new StandardError(
          null,
          'errors.handlers.default',
          frameworkConfig.core.i18n.defaultLocale
        )
      ).to.have.property('statusCode', 500)
    })
  })
})
