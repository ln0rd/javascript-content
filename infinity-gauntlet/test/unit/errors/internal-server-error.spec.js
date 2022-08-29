import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import InternalServerError from 'framework/core/errors/internal-server-error'

describe('Unit => Errors: InternalServerError', function() {
  it("should have a property 'name' equals to 'InternalServerError'", function() {
    expect(
      new InternalServerError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('name', 'InternalServerError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new InternalServerError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 500", function() {
    expect(
      new InternalServerError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('statusCode', 500)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.internal_server',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new InternalServerError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.internal_server',
        frameworkConfig.core.i18n.defaultLocale
      )
    )
  })
})
