import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import BadRequestError from 'framework/core/errors/bad-request-error'

describe('Unit => Errors: BadRequestError', function() {
  it("should have a property 'name' equals to 'BadRequestError'", function() {
    expect(
      new BadRequestError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('name', 'BadRequestError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new BadRequestError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 400", function() {
    expect(
      new BadRequestError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property('statusCode', 400)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.handlers.bad_request',
    frameworkConfig.core.i18n.defaultLocale
  )}'`, function() {
    expect(
      new BadRequestError(frameworkConfig.core.i18n.defaultLocale)
    ).to.have.property(
      'message',
      translate(
        'errors.handlers.bad_request',
        frameworkConfig.core.i18n.defaultLocale
      )
    )
  })

  it("should have a property 'list'", function() {
    const Error = new BadRequestError(frameworkConfig.core.i18n.defaultLocale)

    expect(Error).to.have.property('list').and.not.be.empty
    expect(Error.list[0]).to.have.property('type', 'BadRequestError')
    expect(Error.list[0]).to.have.property('parameter_name', null)
    expect(Error.list[0]).to.have.property(
      'message',
      translate(
        'errors.handlers.bad_request',
        frameworkConfig.core.i18n.defaultLocale
      )
    )
  })
})
