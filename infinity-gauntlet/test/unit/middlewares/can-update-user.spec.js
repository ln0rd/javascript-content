import { expect } from 'chai'
import sinon from 'sinon'
import { canUpdateUser } from 'application/api/middlewares/can-update-user'
import User from 'application/core/models/user'
import Promise from 'bluebird'
import HashboardService from 'application/core/services/hashboard'
import faker from 'faker'

describe('Can update user', () => {
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

  it('should fail user upgrade(escalate) it own privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '5988b562add5f400048a70db' },
      body: {
        user_metadata: { type: 'admin' }
      },
      headers: { origin: 'any' }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canUpdateUser(req, {}, function(err) {
      expect(err.name).to.equal('CannotUpdateUser')
      sinon.assert.callCount(user, 2)
      done()
    })
  })

  it('should fail user upgrade(escalate) other user privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '595d2bc2b10b240004f1fad2' },
      body: {
        user_metadata: { type: 'admin' }
      },
      headers: { origin: 'any' }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canUpdateUser(req, {}, function(err) {
      expect(err.name).to.equal('CannotUpdateUser')
      sinon.assert.callCount(user, 2)
      done()
    })
  })

  it('should fail user downgrade high privileged user privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '595d2bc2b10b240004f1fad2' },
      body: {
        user_metadata: { type: 'ops' }
      },
      headers: { origin: 'any' }
    }

    user
      .withArgs('5988b562add5f400048a70db')
      .returns({ user_metadata: { type: 'ops' } })
    user
      .withArgs('595d2bc2b10b240004f1fad2')
      .resolves({ user_metadata: { type: 'admin' } })

    canUpdateUser(req, {}, function(err) {
      expect(err.name).to.equal('CannotUpdateUser')
      sinon.assert.callCount(user, 2)
      done()
    })
  })

  it('should fail if dont send request origin header', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '595d2bc2b10b240004f1fad2' },
      body: {
        user_metadata: { type: 'ops' }
      }
    }

    canUpdateUser(req, {}, function(err) {
      expect(err.name).to.equal('CannotUpdateUser')
      done()
    })
  })

  it('should success higher privilege user upgrade(escalate) other user privilege', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '595d2bc2b10b240004f1fad2' },
      body: {
        user_metadata: { type: 'admin' }
      },
      headers: { origin: 'any' }
    }

    user
      .withArgs('5988b562add5f400048a70db')
      .returns({ user_metadata: { type: 'admin' } })
    user
      .withArgs('595d2bc2b10b240004f1fad2')
      .resolves({ user_metadata: { type: 'ops' } })

    canUpdateUser(req, {}, function(err) {
      sinon.assert.calledWithExactly(user, '5988b562add5f400048a70db')
      sinon.assert.callCount(user, 1)
      expect(err).to.be.undefined
      done()
    })
  })

  it('should success user change it own data', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '5988b562add5f400048a70db' },
      body: {
        phoneNumber: faker.phone.phoneNumber()
      },
      headers: { origin: 'any' }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canUpdateUser(req, {}, function(err) {
      expect(err).to.be.undefined
      sinon.assert.callCount(user, 1)
      done()
    })
  })

  it('should success user change it own data sending current permission', done => {
    const req = {
      get: () => ({
        id: '5988b562add5f400048a70db'
      }),
      params: { id: '5988b562add5f400048a70db' },
      body: {
        phone_mumber: faker.phone.phoneNumber(),
        user_metadata: { type: 'ops' }
      },
      headers: { origin: 'any' }
    }
    user.resolves({ user_metadata: { type: 'ops' } })

    canUpdateUser(req, {}, function(err) {
      expect(err).to.be.undefined
      sinon.assert.callCount(user, 2)
      done()
    })
  })
})
