import { createClient } from 'modules/cip-integration/client'
import { assert } from 'chai'

describe('CIP Integration => Client', () => {
  describe('#createClient', () => {
    context('when creating a client', () => {
      it('should respond to #authorizeAnticipation', () => {
        const client = createClient({
          baseURL: 'localhost:8000 ',
          timeout: 123
        })

        assert.isFunction(client.authorizeAnticipation)
      })
    })
  })
})
