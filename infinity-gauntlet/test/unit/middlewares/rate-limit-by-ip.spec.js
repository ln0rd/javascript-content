import { RateLimiterRes } from 'rate-limiter-flexible'
import { assert } from 'chai'
import { rateLimitByIP } from 'application/api/middlewares/rate-limit-by-ip'
import { requesterIpAddress } from 'application/api/middlewares/requester-ip-address'

describe('rateLimitByIP Middleware', () => {
  const req = {
    headers: { 'x-forwarded-for': '::ffff:127.0.0.1' }
  }
  req.get = k => req[`${k}`]
  req.set = (k, v) => {
    req[`${k}`] = v
  }

  const composedMiddleware = (getRateLimiter, handler) => (req, res) => {
    const next = () =>
      rateLimitByIP('reset_password', getRateLimiter)(req, res, handler)

    return requesterIpAddress(req, res, next)
  }

  it('should bypass middleware if it cannot get a valid rate limiter', async () => {
    let handler_called = false
    const handler = () => {
      handler_called = true
    }

    const getRateLimiter = async () => {
      throw new Error()
    }

    await composedMiddleware(getRateLimiter, handler)(req, {})
    assert.isTrue(handler_called)
  })

  it('should bypass middleware if rate limiter fails', async () => {
    let handler_called = false
    let consume_called = false

    const handler = () => {
      handler_called = true
    }

    const getRateLimiter = async () => ({
      consume: async () => {
        consume_called = true
        throw new Error('backend error')
      }
    })

    await composedMiddleware(getRateLimiter, handler)(req, {})
    assert.isTrue(consume_called)
    assert.isTrue(handler_called)
  })

  it('should process wrapped handler if IP is not blocked', async () => {
    let handler_called = false
    let consume_called = false

    const handler = () => {
      handler_called = true
    }

    const getRateLimiter = async () => ({
      consume: async () => {
        consume_called = true
      }
    })

    await composedMiddleware(getRateLimiter, handler)(req, {})
    assert.isTrue(consume_called)
    assert.isTrue(handler_called)
  })

  it('should block the request if IP consumed all quota', async () => {
    let handler_called = false
    let consume_called = false

    const handler = () => {
      handler_called = true
    }

    const getRateLimiter = async () => ({
      consume: async () => {
        consume_called = true
        throw new RateLimiterRes()
      }
    })

    const res = {
      send: (status, body) => [status, body]
    }

    const [status, body] = await composedMiddleware(getRateLimiter, handler)(
      req,
      res
    )
    assert.isTrue(consume_called)
    assert.equal(status, 429)
    assert.isObject(body)
    assert.isFalse(handler_called)
  })
})
