import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import UnauthenticatedError from 'framework/core/errors/unauthenticated-error'

describe('Unit => Errors: UnauthenticatedError', function() {
  it("should have a property 'name' equals to 'UnauthenticatedError'", function() {
    expect(
      new UnauthenticatedError(
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    ).to.have.property('name', 'UnauthenticatedError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new UnauthenticatedError(
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 401", function() {
    expect(
      new UnauthenticatedError(
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    ).to.have.property('statusCode', 401)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.unauthorized',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new UnauthenticatedError(
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.unauthenticated',
        frameworkConfig.core.i18n.defaultLocale,
        'hash_key'
      )
    )
  })
})
