import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import InvalidParameterError from 'framework/core/errors/invalid-parameter-error'

describe('Unit => Errors: InvalidParameterError', function() {
  it("should have a property 'name' equals to 'InvalidParameterError'", function() {
    expect(
      new InvalidParameterError(
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    ).to.have.property('name', 'InvalidParameterError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new InvalidParameterError(
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 400", function() {
    expect(
      new InvalidParameterError(
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    ).to.have.property('statusCode', 400)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.invalid_parameter',
    frameworkConfig.core.i18n.defaultLocale,
    'test_name'
  )}'`, function() {
    expect(
      new InvalidParameterError(
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    ).to.have.property(
      'message',
      translate(
        'errors.invalid_parameter',
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    )
  })

  it("should have a property 'list'", function() {
    const Error = new InvalidParameterError(
      frameworkConfig.core.i18n.defaultLocale,
      'test_name'
    )

    expect(Error).to.have.property('list').and.not.be.empty
    expect(Error.list[0]).to.have.property('type', 'InvalidParameterError')
    expect(Error.list[0]).to.have.property('parameter_name', 'test_name')
    expect(Error.list[0]).to.have.property(
      'message',
      translate(
        'errors.invalid_parameter',
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    )
  })
})
