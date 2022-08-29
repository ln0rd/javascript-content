import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import { validate } from 'framework/core/adapters/validator'
import ValidationError from 'framework/core/errors/validation-error'

describe('Unit => Errors: ValidationError', function() {
  it("should have a property 'name' equals to 'ValidationError'", function() {
    expect(
      new ValidationError(
        frameworkConfig.core.i18n.defaultLocale,
        validate('test', {})
      )
    ).to.have.property('name', 'ValidationError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new ValidationError(
        frameworkConfig.core.i18n.defaultLocale,
        validate('test', {})
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 400", function() {
    expect(
      new ValidationError(
        frameworkConfig.core.i18n.defaultLocale,
        validate('test', {})
      )
    ).to.have.property('statusCode', 400)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.validations.required',
    frameworkConfig.core.i18n.defaultLocale,
    'test_name'
  )}'`, function() {
    expect(
      new ValidationError(
        frameworkConfig.core.i18n.defaultLocale,
        validate('test', {})
      )
    ).to.have.property(
      'message',
      translate(
        'errors.validations.required',
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    )
  })

  it("should have a property 'parameterName' equals to 'test_name'", function() {
    expect(
      new ValidationError(
        frameworkConfig.core.i18n.defaultLocale,
        validate('test', {})
      )
    ).to.have.property('parameterName', 'test_name')
  })

  it("should have a property 'schema.required' to be true", function() {
    const Error = new ValidationError(
      frameworkConfig.core.i18n.defaultLocale,
      validate('test', {})
    )

    expect(Error).to.have.property('schema').and.not.be.empty
    expect(Error.schema).to.have.property('required', true)
  })

  it("should have a property 'list'", function() {
    const Error = new ValidationError(
      frameworkConfig.core.i18n.defaultLocale,
      validate('test', {})
    )

    expect(Error).to.have.property('list').and.not.be.empty
    expect(Error.list[0]).to.have.property('type', 'ValidationError')
    expect(Error.list[0]).to.have.property('parameter_name', 'test_name')
    expect(Error.list[0]).to.have.property(
      'message',
      translate(
        'errors.validations.required',
        frameworkConfig.core.i18n.defaultLocale,
        'test_name'
      )
    )
    expect(Error.list[1]).to.have.property('type', 'ValidationError')
    expect(Error.list[1]).to.have.property('parameter_name', 'test_message')
    expect(Error.list[1]).to.have.property(
      'message',
      translate(
        'errors.validations.required',
        frameworkConfig.core.i18n.defaultLocale,
        'test_message'
      )
    )
  })
})
