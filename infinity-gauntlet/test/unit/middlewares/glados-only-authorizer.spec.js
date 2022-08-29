import { assert } from 'chai'
import sinon from 'sinon'
import 'sinon-mongoose'

import config from 'application/core/config'
import Company from 'application/core/models/company'
import User from 'application/core/models/user'
import { signJWT } from 'application/core/services/jwt'
import { gladosOnlyAuthorizer } from 'application/api/middlewares/glados-only-authorizer'
import { generateCompany, generateUser } from 'test/fixtures'

describe('gladosOnlyAuthorizer Middleware', () => {
  let companyFindOneMock
  let userFindOneMock

  beforeEach(function() {
    companyFindOneMock = sinon
      .mock(Company)
      .expects('findOne')
      .chain('select')
      .chain('lean')
      .chain('exec')

    userFindOneMock = sinon
      .mock(User)
      .expects('findOne')
      .chain('select')
      .chain('lean')
      .chain('exec')
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should throw UnauthorizedError when authMethod not jwt or hash_key', async () => {
    let req = { authenticationMethod: 'api_key' }
    let res = {}
    req.get = k => req[`${k}`]

    await gladosOnlyAuthorizer(req, res, err => {
      assert.equal(err, 'UnauthorizedError')
    })
  })

  it('should throw UnauthorizedError when company is missing', async () => {
    let req = { authenticationMethod: 'hash_key' }
    let res = {}
    req.get = k => req[`${k}`]

    await gladosOnlyAuthorizer(req, res, err => {
      assert.equal(err, 'UnauthorizedError')
    })
  })

  it('should throw UnauthorizedError when hash_key is not from glados', async () => {
    let glados = generateCompany({ id: config.permissions.glados_id })
    companyFindOneMock.resolves(glados)

    let req = {
      authenticationMethod: 'hash_key',
      company: {
        id: '60f85d2b4b47503e343b8f87'
      },
      authorization: { basic: { password: 'hash_60f85d2b4b47503e343b8f87' } }
    }
    let res = {}
    req.get = k => req[`${k}`]

    await gladosOnlyAuthorizer(req, res, err => {
      assert.equal(err, 'UnauthorizedError')
    })
  })

  it('should call next without errors when hash_key is from glados', async () => {
    let glados = generateCompany({ id: config.permissions.glados_id })
    companyFindOneMock.resolves(glados)

    let req = {
      authenticationMethod: 'hash_key',
      company: {
        id: config.permissions.glados_id
      },
      authorization: { basic: { password: glados.hash_key } }
    }
    let res = {}
    req.get = k => req[`${k}`]

    await gladosOnlyAuthorizer(req, res, err => {
      assert.isUndefined(err)
    })
  })

  it('should call next without errors when jwt is from glados user', async () => {
    let glados = generateCompany({ id: config.permissions.glados_id })
    companyFindOneMock.resolves(glados)

    let user = generateUser([{ company_id: config.permissions.glados_id }])
    userFindOneMock.resolves(user)

    let req = {
      authenticationMethod: 'jwt',
      user: {
        id: user.id
      },
      company: {
        id: config.permissions.glados_id
      },
      authorization: { basic: { password: signJWT(glados, user, {}) } }
    }
    let res = {}
    req.get = k => req[`${k}`]

    await gladosOnlyAuthorizer(req, res, err => {
      assert.isUndefined(err)
    })
  })
})
