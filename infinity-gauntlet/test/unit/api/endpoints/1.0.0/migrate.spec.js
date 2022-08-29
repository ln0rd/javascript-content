import MigrateEndpoint from 'application/api/endpoints/1.0.0/migrate'
import request from 'supertest'
import restify from 'restify'
import sinon from 'sinon'
import { expect } from 'chai'
import * as mobbi from 'application/queue/tasks/manual/manual-migrate-mobbi-merchants'

describe('Unit => Api => Endpoints => 1.0.0 => Migrate', () => {
  context('mobbi', () => {
    let app

    before(() => {
      app = restify.createServer({
        name: 'myapp',
        version: '1.0.0'
      })
      app.use(restify.plugins.acceptParser(app.acceptable))
      app.use(restify.plugins.queryParser())
      app.use(restify.plugins.bodyParser())
      app.post('/migrate/mobbi', MigrateEndpoint.mobbi)
    })

    afterEach(() => sinon.restore())

    it('when missing company_id param', done => {
      request(app)
        .post('/migrate/mobbi')
        .send({ serial_number: '1999999992' })
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err)
          expect(res.body).to.deep.equal({
            success: false,
            error: 'Missing company_id param.'
          })
          done()
        })
    })

    it('when get error from migrateMerchant function', done => {
      sinon
        .stub(mobbi, 'migrateMerchant')
        .throws(new Error('error-from-migrate-merchant'))

      request(app)
        .post('/migrate/mobbi')
        .send({
          company_id: '5f0c5b9a9c86860006c494d9'
        })
        .expect(500)
        .end(function(err, res) {
          if (err) return done(err)
          expect(res.body).to.deep.equal({
            success: false,
            error: 'Error: error-from-migrate-merchant'
          })
          done()
        })
    })

    it('when success', done => {
      sinon.stub(mobbi, 'migrateMerchant').returns(true)

      request(app)
        .post('/migrate/mobbi')
        .send({
          company_id: '5f0c5b9a9c86860006c494d9'
        })
        .expect(201)
        .end(function(err, res) {
          if (err) return done(err)
          expect(res.body).to.deep.equal({
            success: true,
            error: null
          })
          done()
        })
    })
  })
})
