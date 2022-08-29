import { apiWithHashKey } from 'test/helper'
import frameworkConfig from 'framework/core/config'
import { translate } from 'framework/core/adapters/i18n'

describe('Integration => Application: Error Handlers', function() {
  context('testing BadRequest handler', function() {
    it('should return 400 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/400')
        .json()
        .expectStatus(400)
        .expectBody({
          errors: [
            {
              type: 'BadRequestError',
              parameter_name: null,
              message: translate(
                'errors.handlers.bad_request',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/400'
        })
        .end()
    })
  })

  context('testing BadRequest handler with ValidationError', function() {
    it('should return 400 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/validation_error')
        .json()
        .expectStatus(400)
        .expectBody({
          errors: [
            {
              type: 'ValidationError',
              parameter_name: 'test_name',
              message: translate(
                'errors.validations.required',
                frameworkConfig.core.i18n.defaultLocale,
                'test_name'
              )
            },
            {
              type: 'ValidationError',
              parameter_name: 'test_message',
              message: translate(
                'errors.validations.required',
                frameworkConfig.core.i18n.defaultLocale,
                'test_message'
              )
            }
          ],
          url: '/validation_error'
        })
        .end()
    })
  })

  context('testing Unauthenticated handler', function() {
    it('should return 401 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/401')
        .json()
        .expectStatus(401)
        .expectBody({
          errors: [
            {
              type: 'UnauthenticatedError',
              message: translate(
                'errors.handlers.unauthenticated',
                frameworkConfig.core.i18n.defaultLocale,
                'hash_key'
              )
            }
          ],
          url: '/401'
        })
        .end()
    })
  })

  context('testing Unauthorized handler', function() {
    it('should return 403 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/403')
        .json()
        .expectStatus(403)
        .expectBody({
          errors: [
            {
              type: 'UnauthorizedError',
              message: translate(
                'errors.handlers.unauthorized',
                frameworkConfig.core.i18n.defaultLocale,
                'hash_key'
              )
            }
          ],
          url: '/403'
        })
        .end()
    })
  })

  context('testing NotFound handler', function() {
    it('should return 404 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/404')
        .json()
        .expectStatus(404)
        .expectBody({
          errors: [
            {
              type: 'ResourceNotFoundError',
              message: translate(
                'errors.handlers.not_found',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/404'
        })
        .end()
    })
  })

  context('testing InternalServer handler', function() {
    it('should return 500 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/500')
        .json()
        .expectStatus(500)
        .expectBody({
          errors: [
            {
              type: 'InternalServerError',
              message: translate(
                'errors.handlers.internal_server',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/500'
        })
        .end()
    })
  })

  context('testing MethodNotAllowed handler', function() {
    it('should return 405 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .post('/method_not_allowed')
        .json()
        .expectStatus(405)
        .expectBody({
          errors: [
            {
              type: 'MethodNotAllowedError',
              message: translate(
                'errors.handlers.method_not_allowed',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/method_not_allowed'
        })
        .end()
    })
  })

  context('testing VersionNotAllowed handler', function() {
    it('should return 400 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/version_not_allowed')
        .json()
        .header('Accept-Version', '2.0.0')
        .expectStatus(400)
        .expectBody({
          errors: [
            {
              type: 'InvalidVersionError',
              message: translate(
                'errors.handlers.version_not_allowed',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/version_not_allowed'
        })
        .end()
    })
  })

  context('testing UnsupportedMediaType handler', function() {
    it('should return 415 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .post('/unsupported_media_type')
        .header('Content-Type', 'text/xml')
        .send('<test></test>')
        .expectStatus(415)
        .expectBody(
          `{"errors":[{"type":"UnsupportedMediaTypeError","message":"${translate(
            'errors.handlers.unsupported_media_type',
            frameworkConfig.core.i18n.defaultLocale
          )}"}],"url":"/unsupported_media_type"}`
        )
        .end()
    })
  })

  context('testing restifyError handler', function() {
    it('should return 500 and the correct response body', function() {
      return apiWithHashKey(frameworkConfig.core.i18n.defaultLocale, '')
        .get('/generic_error')
        .json()
        .expectStatus(500)
        .expectBody({
          errors: [
            {
              type: 'InternalError',
              message: translate(
                'errors.handlers.default',
                frameworkConfig.core.i18n.defaultLocale
              )
            }
          ],
          url: '/generic_error'
        })
        .end()
    })
  })
})
