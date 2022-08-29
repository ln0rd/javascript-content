import * as Hapi from '@hapi/hapi'
import { init } from 'interfaces/api'

describe('Healthz API end-to-end tests', () => {
  let server: Hapi.Server

  beforeAll(async () => {
    server = await init()
  })

  afterAll(async () => {
    await server.stop()
  })

  describe('Health routes', () => {
    test('GET /readiness', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/readiness',
      })

      expect(response.statusCode).toEqual(200)
    })

    test('GET /healthz', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/healthz',
      })

      expect(response.statusCode).toEqual(200)
    })
  })
})
