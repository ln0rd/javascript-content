import { should } from 'chai'
import {
  toHashPaymentMethod,
  toHashStatus
} from 'application/core/providers/acquirers/pags/translator'

should()

describe('Unit => PagsWebhook Translator', function() {
  describe('#toHashPaymentMethod', function() {
    context('When receiving an invalid Pags payment_method code', function() {
      it('should return `credit_card` as default', function() {
        const INVALID_CODE = '99999'
        const result = toHashPaymentMethod(INVALID_CODE)

        return result.should.equal('credit_card')
      })
    })

    context('When receiving a valid Pags payment_method code', function() {
      it('should return `credit_card` as when code is 1', function() {
        const CODE = '1'
        const result = toHashPaymentMethod(CODE)

        return result.should.equal('credit_card')
      })

      it('should return `debit_card` as when code is 8', function() {
        const CODE = '8'
        const result = toHashPaymentMethod(CODE)

        result.should.equal('debit_card')
      })

      it('should return `boleto` when code is 2', function() {
        const CODE = '2'
        const result = toHashPaymentMethod(CODE)

        return result.should.equal('boleto')
      })
    })
  })

  describe('#toHashStatus', function() {
    context('when receiving a valid code it should', function() {
      const codesAndStatuses = [
        { code: '1', status: 'processing' },
        { code: '2', status: 'processing' },
        { code: '3', status: 'paid' },
        { code: '4', status: 'paid' },
        { code: '5', status: 'chargedback' },
        { code: '6', status: 'refunded' },
        { code: '7', status: 'refused' },
        { code: '8', status: 'chargedback' },
        { code: '9', status: 'chargedback' }
      ]

      for (const pair of codesAndStatuses) {
        it(`should return ${pair.status} when PagsCode is ${
          pair.code
        }`, function() {
          const result = toHashStatus(pair.code)

          return result.should.equal(pair.status)
        })
      }
    })
  })
})
