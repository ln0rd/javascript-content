// its a copy of cache-by-company.js but support userId because of Leo Portfolios
import restifyCache from '@hashlab/restify-cache'
import config from 'framework/core/config'
import createLogger from 'framework/core/adapters/logger'

const Logger = createLogger({ name: 'CACHE_METRICS_MIDDLEWARE' })

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
      const userGet = req.get('user')
      const userId = req.get('user') && req.get('user').id ? userGet.id : ''
      if (!companyId) {
        // Do not cache
        return null
      }

      const key = `${[companyId, userId].join(':')}:${
        req.url
      }?${req.getQuery()}`

      Logger.debug({ cacheKey: key })
      return key
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
