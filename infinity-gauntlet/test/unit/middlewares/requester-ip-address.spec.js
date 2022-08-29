import { assert } from 'chai'
import { requesterIpAddress } from 'application/api/middlewares/requester-ip-address'

describe('requesterIpAddress Middleware', () => {
  const wrappedEndpoint = () => true
  const ipAddress = '1.1.1.1'

  const buildReq = req => {
    req.get = k => req[`${k}`]
    req.set = (k, v) => {
      req[`${k}`] = v
    }

    return req
  }

  it('should set requesterIpAddress req parameter from headers values', () => {
    // Note: request headers are always provided in lowercase by the framework
    const requests = [
      { headers: { 'x-client-ip': ipAddress } },
      { headers: { 'x-forwarded-for': ipAddress } },
      { headers: { 'x-real-ip': ipAddress } },
      { connection: { remoteAddress: ipAddress } },
      {
        headers: { 'x-bacon': '1.1.2.2' },
        info: { remoteAddress: ipAddress }
      }
    ]

    for (let data of requests) {
      const req = buildReq(data)
      const resp = requesterIpAddress(req, {}, wrappedEndpoint)

      assert.isTrue(resp)
      assert.equal(req.get('requesterIpAddress'), ipAddress)
    }
  })
})
