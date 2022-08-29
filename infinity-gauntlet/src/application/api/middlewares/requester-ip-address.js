import { getClientIp } from 'request-ip'

export function requesterIpAddress(req, _, next) {
  // The rules and order of resolved IP is available at
  // https://www.npmjs.com/package/request-ip#how-it-works
  req.set('requesterIpAddress', getClientIp(req))

  return next()
}
