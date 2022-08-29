import { apiWithHashKey } from 'test/helper'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'

describe('Integration => Application: I18N', function() {
  context('when with locale', function() {
    it('should return 200 and the response in pt-BR', function() {
      return apiWithHashKey('pt-BR', '')
        .get('/')
        .json()
        .expectStatus(200)
        .expectBody({
          name: translate('endpoints.root.name', 'pt'),
          message: translate('endpoints.root.message', 'pt'),
          documentation: translate('endpoints.root.documentation', 'pt')
        })
        .end()
    })
  })

  context('when without locale', function() {
    it('should return 200 and the response in the default locale', function() {
      return apiWithHashKey('', '')
        .get('/')
        .json()
        .expectStatus(200)
        .expectBody({
          name: translate(
            'endpoints.root.name',
            frameworkConfig.core.i18n.defaultLocale
          ),
          message: translate(
            'endpoints.root.message',
            frameworkConfig.core.i18n.defaultLocale
          ),
          documentation: translate(
            'endpoints.root.documentation',
            frameworkConfig.core.i18n.defaultLocale
          )
        })
        .end()
    })
  })
})
