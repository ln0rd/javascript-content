import { redisClient } from 'framework/core/adapters/redis'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import createLogger from 'framework/core/adapters/logger'
import { translate } from 'framework/core/adapters/i18n'
import appConfig from 'application/core/config'

const Logger = createLogger({ name: 'RATE_LIMITER' })

export async function getRateLimiterRedis(selector) {
  const rlConfig = appConfig.middlewares.rate_limiter[`${selector}`]

  // Params documentation at
  // https://github.com/animir/node-rate-limiter-flexible/wiki/Options
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: rlConfig.key_prefix,
    points: rlConfig.max_requests,
    duration: rlConfig.duration_window_seconds,
    blockDuration: rlConfig.block_duration,
    inmemoryBlockOnConsumed: 30
  })

  return rateLimiter
}

// We bypass this middleware and fallback to default behavior from
// wrapped endpoint when external dependencies (e.g. redis) are not healthy
export function rateLimitByIP(selector, getRateLimiter) {
  let rateLimiter = undefined

  return async function(req, res, next) {
    if (!appConfig.middlewares.rate_limiter[`${selector}`].enabled) {
      return next()
    }

    if (!rateLimiter) {
      try {
        rateLimiter = await getRateLimiter(selector)
      } catch (err) {
        Logger.error(
          {
            message: `failed to get rate limiter: ${err.message}`,
            endpoint: req.url
          },
          'rate-limiting-error'
        )

        return next()
      }
    }

    // requesterIpAddress is set by requester-ip-address middleware
    const ip = req.get('requesterIpAddress')
    try {
      await rateLimiter.consume(ip)
      return next()
    } catch (err) {
      if (err instanceof Error) {
        Logger.error(
          {
            message: `rate limiter backend failure: ${err.message}`,
            endpoint: req.url
          },
          'rate-limiting-error'
        )

        return next()
      }

      Logger.warn(
        {
          message: `blocked password reset request from IP: ${ip}`,
          endpoint: req.url
        },
        'rate-limiting-blocked-request'
      )

      const locale = req.get('locale')
      return res.send(429, {
        message: translate('errors.handlers.too_many_requests', locale, {})
      })
    }
  }
}

export default function redisRateLimiter(selector) {
  return rateLimitByIP(selector, getRateLimiterRedis)
}
