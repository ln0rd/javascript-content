import { ServerRoute } from '@hapi/hapi'
import { responseObject } from '../validations/response-validation'

const healthz: ServerRoute = {
  path: '/healthz',
  method: 'GET',
  handler: () => ({
    status: 'OK',
  }),
  options: {
    tags: ['api'],
    response: responseObject,
  },
}

const readiness: ServerRoute = {
  path: '/readiness',
  method: 'GET',
  handler: () => ({
    status: 'OK',
  }),
  options: {
    tags: ['api'],
    response: responseObject,
  },
}

const HealthRoutes = { healthz, readiness }

export { HealthRoutes }
