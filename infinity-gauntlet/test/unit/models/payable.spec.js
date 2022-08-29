import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { Error } from 'mongoose'

import Payable from 'application/core/models/payable'
import { generatePayable } from 'test/fixtures/index'

chai.use(chaiAsPromised)

const { expect } = chai

describe('Unit => Models: Payable', () => {
  describe('#type', () => {
    describe('given correct types', () => {
      ;['credit', 'refund', 'chargeback_debit'].forEach(type => {
        it('it passes validation', () => {
          const data = generatePayable({ type })

          expect(new Payable(data).validate()).to.not.be.rejected
        })
      })
    })

    describe('given incorrect types', () => {
      ;['credito', 'refoond', 'cashback_credit'].forEach(type => {
        it('it does not pass validation', () => {
          const data = generatePayable({ type })

          expect(new Payable(data).validate()).to.be.rejectedWith(
            Error.ValidationError
          )
        })
      })
    })
  })

  describe('#cip_escrowed_amount', () => {
    describe('given correct types', () => {
      ;[1200, 1, 300].forEach(cip_escrowed_amount => {
        it('it passes validation', () => {
          const data = generatePayable({ cip_escrowed_amount })

          expect(new Payable(data).validate()).to.eventually.not.be.rejected
        })
      })
    })

    describe('given incorrect types', () => {
      ;['mil', () => {}].forEach(cip_escrowed_amount => {
        it('it does not pass validation', () => {
          const data = generatePayable({ cip_escrowed_amount })

          expect(new Payable(data).validate()).to.eventually.be.rejectedWith(
            Error.ValidationError
          )
        })
      })
    })
  })
})
