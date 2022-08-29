import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import ForbiddenError from 'framework/core/errors/forbidden-error'

describe('Unit => Errors: ForbiddenError', function() {
  it("should have a property 'name' equals to 'ForbiddenError'", function() {
    expect(
      new ForbiddenError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('name', 'ForbiddenError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new ForbiddenError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 403", function() {
    expect(
      new ForbiddenError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('statusCode', 403)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.forbidden',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new ForbiddenError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.forbidden',
        frameworkConfig.core.i18n.defaultLocale
      )
    )
  })
})
