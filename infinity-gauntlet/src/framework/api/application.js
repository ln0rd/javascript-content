import R from 'ramda'
import restify from 'restify'
import Promise from 'bluebird'
import router from 'framework/api/router'
import config from 'framework/core/config'
import { HttpError } from 'restify-errors'
import middlewares from 'framework/api/middlewares'
import corsMiddleware from 'restify-cors-middleware'
import { translate } from 'framework/core/adapters/i18n'
import createLogger from 'framework/core/adapters/logger'
import applicationMiddlewares from 'application/api/middlewares'
import { hrTimeDurationInMs } from 'framework/core/helpers/timer'
import { captureError } from 'framework/core/adapters/error-reporter'
import { deepHideKey } from 'framework/core/helpers/commons'

const Logger = createLogger({ name: 'APPLICATION' })

const Cors = corsMiddleware(config.api.cors)

export default function run(opts) {
  return Promise.resolve()
    .then(defineServer)
    .tap(definePreHooks)
    .tap(defineCustomPreHooks)
    .tap(definePlugins)
    .tap(defineCustomMiddlewares)
    .tap(defineCustomApplicationMiddlewares)
    .tap(defineEndpoints)
    .tap(defineAuditLogger)
    .tap(defineErrorHandlers)

  function defineServer() {
    Logger.debug('Defining server.')

    return restify.createServer({
      name: config.api.server.name,
      version: config.api.version,
      log: Logger,
      ignoreTrailingSlash: true,
      handleUncaughtExceptions: true,
      formatters: {
        'application/json': formatErrors
      }
    })
  }

  function definePreHooks(server) {
    Logger.debug('Defining pre hooks.')

    server.pre(restify.plugins.pre.context())
    server.pre(restify.plugins.pre.reqIdHeaders({ headers: ['X-Request-Id'] }))
    server.pre(restify.plugins.pre.userAgentConnection())
    server.pre(Cors.preflight)
  }

  function defineCustomPreHooks(server) {
    Logger.debug('Defining custom pre hooks.')

    // Custom pre hooks here
    server.pre((req, res, next) => {
      res.charSet('utf-8')
      return next()
    })
    server.pre((req, res, next) => {
      res.header('X-Request-Id', req.id())
      return next()
    })
  }

  function definePlugins(server) {
    Logger.debug('Defining plugins.')

    server.use(restify.plugins.acceptParser(server.acceptable))
    server.use(restify.plugins.authorizationParser())
    server.use(restify.plugins.dateParser())
    server.use(restify.plugins.queryParser())
    server.use(restify.plugins.gzipResponse())
    server.use(restify.plugins.bodyParser({ rejectUnknown: true }))
    server.use(restify.plugins.requestLogger())
    server.use(Cors.actual)
  }

  function defineCustomMiddlewares(server) {
    Logger.debug('Defining custom middlewares.')

    return middlewares(server)
  }

  function defineCustomApplicationMiddlewares(server) {
    Logger.debug('Defining custom application middlewares.')

    return applicationMiddlewares(server)
  }

  function defineEndpoints(server) {
    Logger.debug('Loading endpoints.')

    return router(server, opts)
  }

  function defineAuditLogger(server) {
    Logger.debug('Defining audit logger')

    let RequestLogger = createLogger({ name: 'REQUEST' })
    const keysToHide = config.api.logIgnoreSensitiveFields

    RequestLogger.addSerializers({
      req: function(req) {
        const path = req.path()
        let body
        if (
          req._shouldLogBody ||
          path === '/transactions/queue_register' ||
          path === '/transactions/register'
        ) {
          try {
            // We do not want each field indexed
            body = JSON.stringify(deepHideKey(req.body, keysToHide))
          } catch (err) {
            Logger.error(
              { err },
              'AuditLogger request serializer failed to JSON.stringify response body'
            )
            body = '@@BODY-STRINGIFY-ERROR@@'
          }
        }

        let timers = {}
        let _timers = req.timers || []
        _timers.forEach(function forEach(time) {
          var t = time.time
          var _t = Math.floor(1000000 * t[0] + t[1] / 1000)
          timers[time.name] = (timers[time.name] || 0) + _t
        })
        return {
          method: req.method,
          path,
          url: req.url,
          params: req.params,
          query: req.query,
          body,
          headers: req.headers,
          timers,
          // highlightedFields
          special_fields: req.get('special_fields')
        }
      },
      res: function(res) {
        if (!res || !res.statusCode) return res

        let body
        if (res._body instanceof HttpError) {
          try {
            // We do not want each field indexed
            body = JSON.stringify(res._body.body)
          } catch (err) {
            Logger.error(
              { err },
              'AuditLogger response serializer failed to JSON.stringify response body'
            )
          }
        }

        /**
         * Utility to get response headers from a given response.
         * Manually generates a POJO from `res.getHeaderNames` and `res.getHeader`,
         * if available, falling back to deprecated `res._headers`, otherwise.
         * Intentionally does not use `res.getHeaders` to avoid deserialization
         * issues with object returned by that method.
         *
         * @param {http.ServerResponse} res - the OutgoingMessage
         * @private
         * @function getResponseHeaders
         * @returns {object} map from header name to header value
         * @see https://github.com/restify/node-restify/issues/1370
         */
        function getResponseHeaders(res) {
          if (res.getHeaderNames && res.getHeader) {
            return res.getHeaderNames().reduce(function reduce(prev, curr) {
              var header = {}
              header[curr] = res.getHeader(curr)
              return Object.assign({}, prev, header)
            }, {})
          }
          return res._headers
        }

        return {
          statusCode: res.statusCode,
          headers: getResponseHeaders(res),
          body
        }
      }
    })

    // We want to ignore /healthz because of https://github.com/hashlab/infinity-gauntlet/issues/127#issuecomment-441119240
    // Also OPTIONS requests are not interesting
    const shouldAuditRequest = function(req) {
      return req && !req.url.includes('/healthz') && req.method !== 'OPTIONS'
    }

    server.on('after', function audit(req, res, route, err) {
      if (shouldAuditRequest(req)) {
        const latency = hrTimeDurationInMs(req._timeStart, req._timeFlushed)
        if (config.api.logAllRequestsBody) {
          req._shouldLogBody = true
        } else if (
          route &&
          route.spec &&
          (route.spec.path ===
            '/children/:child_id/transactions/queue_register' ||
            route.spec.path === '/children/:child_id/transactions/register')
        ) {
          req._shouldLogBody = true
        }
        var obj = {
          remoteAddress: req.connection.remoteAddress,
          remotePort: req.connection.remotePort,
          req_id: req.getId(),
          req: req,
          res: res,
          latency,
          err: err,
          secure: req.secure,
          route,
          _audit: true,
          context: {
            // This is set by middlewares/authenticator
            company_id: R.pathOr(null, ['id'], req.get('company')),
            // This is set by middlewares/authenticator
            user_id: R.pathOr(null, ['id'], req.get('user'))
          }
        }

        RequestLogger.info(obj, 'handled: %d', res.statusCode)
      }
    })
  }

  function defineErrorHandlers(server) {
    Logger.debug('Defining error handlers.')

    server.on('BadRequest', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        if (err.public && R.has('list', err)) {
          return {
            errors: err.list,
            url: req.path()
          }
        }

        return {
          errors: [
            {
              type: err.name,
              parameter_name: null,
              message: translate(
                'errors.handlers.bad_request',
                req.get('locale')
              )
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('Unauthorized', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: err.public
                ? err.message
                : translate('errors.handlers.unauthorized', req.get('locale'))
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('Forbidden', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: err.public
                ? err.message
                : translate('errors.handlers.forbidden', req.get('locale'))
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('NotFound', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: err.public
                ? err.message
                : translate('errors.handlers.not_found', req.get('locale'))
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('InternalServer', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: err.public
                ? err.message
                : translate(
                    'errors.handlers.internal_server',
                    req.get('locale')
                  )
            }
          ],
          url: req.path()
        }
      }

      captureError(
        err,
        {
          logger: 'REQUEST',
          level: 'error',
          request: req,
          response: res,
          captured_on: 'InternalServer',
          company_id: R.pathOr(null, ['id'], req.get('company')),
          user_id: R.pathOr(null, ['id'], req.get('user'))
        },
        true
      )

      return cb()
    })

    server.on('MethodNotAllowed', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: translate(
                'errors.handlers.method_not_allowed',
                req.get('locale')
              )
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('VersionNotAllowed', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: translate(
                'errors.handlers.version_not_allowed',
                req.get('locale')
              )
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('UnsupportedMediaType', (req, res, err, cb) => {
      err.toJSON = function toJSON() {
        return {
          errors: [
            {
              type: err.name,
              message: translate(
                'errors.handlers.unsupported_media_type',
                req.get('locale')
              )
            }
          ],
          url: req.path()
        }
      }

      return cb()
    })

    server.on('restifyError', (req, res, err, cb) => {
      if (!R.has('public', err)) {
        captureError(
          err,
          {
            logger: 'REQUEST',
            level: 'error',
            request: req,
            response: res,
            captured_on: 'restifyError',
            company_id: R.pathOr(null, ['id'], req.get('company')),
            user_id: R.pathOr(null, ['id'], req.get('user'))
          },
          true
        )
      }

      return cb()
    })
  }
}

function formatErrors(req, res, err) {
  if (!(err instanceof Error)) {
    return JSON.stringify(err)
  }

  if (
    R.is(Function, err.toJSON) &&
    R.has('errors', err.toJSON()) &&
    R.has('url', err.toJSON())
  ) {
    return JSON.stringify(err)
  }

  err.toJSON = function toJSON() {
    if (err.public && R.has('list', err)) {
      return {
        errors: err.list,
        url: req.path()
      }
    }

    return {
      errors: [
        {
          type: err.name,
          message: err.public
            ? err.message
            : translate('errors.handlers.default', req.get('locale'))
        }
      ],
      url: req.path()
    }
  }

  return JSON.stringify(err)
}
