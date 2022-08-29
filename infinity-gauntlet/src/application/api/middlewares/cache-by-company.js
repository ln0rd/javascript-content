import restifyCache from '@hashlab/restify-cache'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'CACHE_MIDDLEWARE' })

let beforeRequest, afterRequest

function createHooks() {
  const redisStorage = restifyCache.storages.redis({
    logger: Logger,
    url: config.core.redis.url,
    getTimeoutMs: 5000
  })

  const hooks = restifyCache.createHooks({
    logger: Logger,
    ttlInSeconds: 300,
    storage: redisStorage,
    key: function(req) {
      const companyId = req.get('company').id
      if (!companyId) {
        // Do not cache
        return null
      }
      Logger.debug(`${companyId}:${req.url}?${req.getQuery()}`)
      return `${companyId}:${req.url}?${req.getQuery()}`
    }
  })

  beforeRequest = hooks.beforeRequest
  afterRequest = hooks.afterRequest
}

export function serveCachedResponse() {
  if (!beforeRequest) {
    createHooks()
  }
  return function serveCachedResponseByCompany(req, res, next) {
    beforeRequest(req, res, next)
  }
}

export function cacheResponseAfterRequest() {
  if (!afterRequest) {
    createHooks()
  }

  return function cacheResponseByCompany(req, res, next) {
    if (res.header('x-cache') !== 'HIT') {
      try {
        afterRequest(req, res, next)
      } catch (err) {
        // Do not crash the route
        Logger.error({ err }, 'cache afterRequest failed')
      }
    }
  }
}

export default {
  serveCachedResponse,
  cacheResponseAfterRequest
}
