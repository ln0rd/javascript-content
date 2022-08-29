import { expect } from 'chai'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'

describe('Unit => Errors: ModelNotFoundError', function() {
  it("should have a property 'name' equals to 'ModelNotFoundError'", function() {
    expect(
      new ModelNotFoundError(
        frameworkConfig.core.i18n.defaultLocale,
        translate('models.test', frameworkConfig.core.i18n.defaultLocale)
      )
    ).to.have.property('name', 'ModelNotFoundError')
  })

  it("should have a property 'public' to be true", function() {
    expect(
      new ModelNotFoundError(
        frameworkConfig.core.i18n.defaultLocale,
        translate('models.test', frameworkConfig.core.i18n.defaultLocale)
      )
    ).to.have.property('public', true)
  })

  it("should have a property 'statusCode' equals to 404", function() {
    expect(
      new ModelNotFoundError(
        frameworkConfig.core.i18n.defaultLocale,
        translate('models.test', frameworkConfig.core.i18n.defaultLocale)
      )
    ).to.have.property('statusCode', 404)
  })

  it(`should have a property 'message' equals to '${translate(
    'errors.model_not_found',
    frameworkConfig.core.i18n.defaultLocale,
    translate('models.test', frameworkConfig.core.i18n.defaultLocale)
  )}'`, function() {
    expect(
      new ModelNotFoundError(
        frameworkConfig.core.i18n.defaultLocale,
        translate('models.test', frameworkConfig.core.i18n.defaultLocale)
      )
    ).to.have.property(
      'message',
      translate(
        'errors.model_not_found',
        frameworkConfig.core.i18n.defaultLocale,
        translate('models.test', frameworkConfig.core.i18n.defaultLocale)
      )
    )
  })
})
