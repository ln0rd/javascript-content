import { expect } from 'chai'
import sinon from 'sinon'
import { isUserISOMember } from 'application/api/middlewares/is-user-iso-member'
import Company from 'application/core/models/company'
import Promise from 'bluebird'

describe('Is company user an ISO member', () => {
  const req = {
    get: () => ({
      id: '606382a65b80110006d7f709'
    }),
    body: {
      name: 'Portfolio',
      owner_id: '5dcdb24498f88c0007f7e912',
      viewers: ['5dcdb24498f88c0007f7e912']
    }
  }
  let company

  beforeEach(() => {
    company = sinon.stub(Company, 'findOne').usingPromise(Promise)
  })

  afterEach(() => {
    company.restore()
  })

  it('should fail if company is not an iso member', done => {
    company.resolves(false)

    isUserISOMember(req, {}, function(err) {
      expect(err.name).to.equal('UserIsNotISOMember')
      done()
    })
  })

  it('should sucess if company is an iso member', done => {
    company.resolves(true)

    isUserISOMember(req, {}, function(err) {
      expect(err).to.be.undefined
      done()
    })
  })
})
