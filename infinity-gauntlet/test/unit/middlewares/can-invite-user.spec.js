import { expect } from 'chai'
import sinon from 'sinon'
import { canInviteUser } from 'application/api/middlewares/can-invite-user'
import User from 'application/core/models/user'
import Promise from 'bluebird'
import HashboardService from 'application/core/services/hashboard'

describe('Can invite user', () => {
  let user
  let service

  beforeEach(() => {
    user = sinon.stub(User, 'findById').usingPromise(Promise)
    service = sinon.stub(HashboardService, 'getConfigFile').callsFake(() => {
      return {
        dashboard: { accessControlEnabled: true },
        accessControl: {
          roles: { ADMIN: { accessLevel: 0 }, OPS: { accessLevel: 666 } }
        }
      }
    })
  })

  afterEach(() => {
    user.restore()
    service.restore()
  })

  it('should fail to invite an user with higher privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      body: {
        role: {
          type: 'admin'
        }
      }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canInviteUser(req, {}, function(err) {
      expect(err.name).to.equal('CannotInviteUser')
      done()
    })
  })

  it('should succeed to invite an user with equal privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      body: {
        role: {
          type: 'ops'
        }
      }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canInviteUser(req, {}, function(err) {
      sinon.assert.calledWithExactly(user, '5988b562add5f400048a70db')
      sinon.assert.callCount(user, 1)
      expect(err).to.be.undefined
      done()
    })
  })

  it('should succeed to invite an user with lower privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      body: {
        role: {
          type: 'ops'
        }
      }
    }
    user.resolves({ user_metadata: { type: 'admin' } })

    canInviteUser(req, {}, function(err) {
      sinon.assert.calledWithExactly(user, '5988b562add5f400048a70db')
      sinon.assert.callCount(user, 1)
      expect(err).to.be.undefined
      done()
    })
  })
})
