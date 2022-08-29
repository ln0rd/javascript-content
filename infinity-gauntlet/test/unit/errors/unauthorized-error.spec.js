import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import UnauthorizedError from 'framework/core/errors/unauthorized-error'

describe('Unit => Errors: UnauthorizedError', function() {
  it("should have a property 'name' equals to 'UnauthorizedError'", function() {
    expect(
      new UnauthorizedError(frameworkConfig.core.i18n.defaultLocale, 'hash_key')
    ).to.have.property('name', 'UnauthorizedError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new UnauthorizedError(frameworkConfig.core.i18n.defaultLocale, 'hash_key')
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 403", function() {
    expect(
      new UnauthorizedError(frameworkConfig.core.i18n.defaultLocale, 'hash_key')
    ).to.have.property('statusCode', 403)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.unauthorized',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new UnauthorizedError(frameworkConfig.core.i18n.defaultLocale, 'hash_key')
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.unauthorized',
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    )
  })
})
