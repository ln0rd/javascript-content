import { expect } from 'chai'
import Promise from 'bluebird'
import {
  getMDR,
  installmentAmount,
  installmentPaymentDate
} from 'application/core/domain/agenda'

import { creditTransaction, debitTransaction } from 'test/mocks/transaction'
import { aquirer, aquirerWithNoBrands } from 'test/mocks/aquirer'

describe('Unit => Domain: Agenda', () => {
  context('installmentAmount', () => {
    it('should add the remainder amount to the first installment', () => {
      const transaction = { amount: 17, installments: 2 }
      const installment = 1

      expect(installmentAmount(transaction, installment)).to.equal(9)
    })

    it('should add the rounded amount to the second installment', () => {
      const transaction = { amount: 17, installments: 2 }
      const installment = 2

      expect(installmentAmount(transaction, installment)).to.equal(8)
    })
  })

  context('installmentPaymentDate', () => {
    it('should have the first installment payment date on the next business day when it is debit', () => {
      const transaction = debitTransaction()
      const nextBusinessDay = date => Promise.resolve(date)

      const result = installmentPaymentDate(transaction, 1, nextBusinessDay)

      return result.then(r => {
        expect(r.format('YYYY-MM-DD')).to.equal('2018-11-14')
        return r
      })
    })

    it('should have the first installment payment date after 30 days when it is credit', () => {
      const transaction = creditTransaction()
      const nextBusinessDay = date => Promise.resolve(date)

      const result = installmentPaymentDate(transaction, 1, nextBusinessDay)

      return result.then(r => {
        expect(r.format('YYYY-MM-DD')).to.equal('2018-12-13')
        return r
      })
    })

    it('should have the second installment payment date after 60 days when it is credit', () => {
      const transaction = creditTransaction()
      const nextBusinessDay = date => Promise.resolve(date)

      const result = installmentPaymentDate(transaction, 2, nextBusinessDay)

      return result.then(r => {
        expect(r.format('YYYY-MM-DD')).to.equal('2019-01-12')
        return r
      })
    })
  })

  context('getMDR', () => {
    it('should have mdr 4 when the transaction is credit with 2 installments', () => {
      const transaction = creditTransaction()
      const credential = aquirer().credentials[0]

      expect(getMDR(transaction, credential.pricing.brands)).to.equal(4)
    })

    it('should have default mdr when the brands are not configure', () => {
      const transaction = creditTransaction()
      const credential = aquirerWithNoBrands().credentials[0]

      expect(getMDR(transaction, credential.pricing.brands)).to.equal(3.99)
    })
  })
})
