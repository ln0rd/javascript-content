import fs from 'fs'
import R from 'ramda'
import restify from 'restify'
import { join } from 'path'
import Promise from 'bluebird'
import config from 'framework/core/config'
import endpoints from 'application/api/endpoints'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'ROUTER' })

const Base = join(config.root_path, 'build', 'application', 'api', 'endpoints')

const Methods = {
  GET: 'get',
  HEAD: 'head',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'del',
  OPTIONS: 'opts'
}

const EndpointList = []

export default function run(server, opts) {
  return Promise.resolve()
    .tap(loadEndpoints)
    .then(addRoutes)

  function loadEndpoints() {
    return endpoints(opts)
  }

  function addRoutes() {
    return Promise.each(EndpointList, route => {
      Logger.debug(
        `Loading endpoint => ${route.method.toUpperCase()} ${
          route.options.path
        } of version ${route.options.version}`
      )

      function executeRoute(req, res, next) {
        return Promise.resolve()
          .then(execute)
          .then(callNext)
          .catch(requestErrorHandler)

        function execute() {
          if (res.header('x-cache') !== 'HIT') {
            return route.handler(req, res)
          } else {
            return Promise.resolve()
          }
        }

        function callNext() {
          return next()
        }

        function requestErrorHandler(err) {
          return next(err)
        }
      }

      const middlewares = route.middlewares || []
      const afterwares = route.afterwares || []
      const executionChain = middlewares
        .concat([executeRoute])
        .concat(afterwares)

      return server[route.method](
        route.options,
        restify.plugins.conditionalHandler([
          { version: [route.options.version], handler: executionChain }
        ])
      )
    })
  }
}

export function declareVersion(version, routes) {
  return Promise.resolve()
    .then(checkVersion)
    .tap(checkVersionExists)
    .then(searchForEndpoints)

  function checkVersion() {
    Logger.debug(`Checking if version ${version} exists.`)

    // eslint-disable-next-line promise/avoid-new
    return new Promise((resolve, reject) => {
      fs.stat(join(Base, version), (err, stats) => {
        if (err) {
          return reject(err)
        }

        if (!stats.isDirectory()) {
          return resolve(false)
        }

        return resolve(true)
      })
    })
  }

  function checkVersionExists(exists) {
    if (!exists) {
      throw new Error(
        `Version ${version} not loaded because the directory was not found.`
      )
    }
  }

  function searchForEndpoints() {
    return Promise.each(routes, route => {
      return Promise.resolve()
        .then(checkEndpoint)
        .tap(checkEndpointExists)
        .then(requireEndpoint)

      function checkEndpoint() {
        Logger.debug(
          `Checking if handler ${route.handler} of version ${version} exists.`
        )

        // eslint-disable-next-line promise/avoid-new
        return new Promise((resolve, reject) => {
          fs.stat(
            join(Base, version, `${R.head(R.split('.', route.handler))}.js`),
            (err, stats) => {
              if (err) {
                return reject(err)
              }

              if (!stats.isFile()) {
                return resolve(false)
              }

              return resolve(true)
            }
          )
        })
      }

      function checkEndpointExists(exists) {
        if (!exists) {
          throw new Error(
            `Endpoint ${
              route.handler
            } of version ${version} not loaded because the file was not found.`
          )
        }
      }

      function requireEndpoint() {
        // eslint-disable-next-line
        const Handler = require(join(Base, version, R.head(R.split('.', route.handler)))).default

        if (!R.is(Function, Handler[R.last(R.split('.', route.handler))])) {
          throw new Error(
            `Invalid endpoint ${
              route.handler
            }. Endpoint should have a static method '${R.last(
              R.split('.', route.handler)
            )}'.`
          )
        }

        return EndpointList.push({
          method: Methods[route.method],
          options: {
            version,
            path: route.path
          },
          middlewares: route.middlewares,
          afterwares: route.afterwares,
          handler: Handler[R.last(R.split('.', route.handler))]
        })
      }
    })
  }
}
