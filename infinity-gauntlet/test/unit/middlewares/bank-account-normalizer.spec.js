import chai from 'chai'
import { generateCompany } from 'test/fixtures'
import { bankAccountNormalizer } from 'application/api/middlewares/bank-account-normalizer'

const { expect } = chai

describe('bank-account-normalizer Middleware', () => {
  ;[['3', '0003'], ['02', '0002'], ['004', '0004']].forEach(([act, assert]) => {
    it('should call next with bank_account.agencia changed', async () => {
      let company = generateCompany()
      company.bank_account.agencia = act
      let req = {
        body: company
      }
      let res = {}
      req.get = k => req[`${k}`]

      await bankAccountNormalizer(req, res, err => {
        expect(req.body.bank_account.agencia).to.be.equal(assert)
        expect(err).to.be.undefined
      })
    })
  })
  ;[['1234'], ['02154']].forEach(([agencia]) => {
    it('should call next without change bank_account.agencia', async () => {
      let company = generateCompany()
      company.bank_account.agencia = agencia
      let req = {
        body: company
      }
      let res = {}
      req.get = k => req[`${k}`]

      await bankAccountNormalizer(req, res, err => {
        expect(req.body.bank_account.agencia).to.be.equal(agencia)
        expect(err).to.be.undefined
      })
    })
  })
})
