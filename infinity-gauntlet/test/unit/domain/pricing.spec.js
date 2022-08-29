import { expect } from 'chai'
import {
  FLAT,
  hasBoletoPricing,
  getBrandPrice,
  getTransactionPricingByFeeRule,
  getTransactionPricingByAffiliation
} from 'application/core/domain/pricing'
import {
  boletoTransaction,
  creditTransaction,
  debitTransaction,
  withOneInstallment,
  withTenInstallments,
  withTwoInstallments
} from 'test/mocks/transaction'
import {
  feeRule as MockFeeRule,
  feeRuleWithNoBrands
} from 'test/mocks/fee-rule'
import { generateAffiliation } from 'test/fixtures'
import { affiliationWithCostsAndNoBrands } from 'test/mocks/affiliation'
import { PERCENTAGE } from '../../../src/application/core/domain/pricing'

describe('Unit => Domain: Pricing', () => {
  context('hasBoletoPricing', () => {
    it('should return true if boleto_pricing exists', () => {
      const rightboletoPricing = {
        amount: 2,
        amount_type: 'flat'
      }
      expect(hasBoletoPricing(rightboletoPricing)).to.be.true
    })
    it('should return false if boleto_pricing not exists or is not right', () => {
      expect(hasBoletoPricing(null)).to.equal(false)
      expect(hasBoletoPricing({})).to.equal(false)
      expect(hasBoletoPricing({ amount: 'amount' })).to.equal(false)
    })
  })
  context('getBrandPrice', () => {
    const visaPrices = {
      debit: 2,
      credit_1: 3,
      credit_2: 4,
      credit_7: 5
    }
    it('should price debit transaction', () => {
      const transaction = debitTransaction()
      expect(getBrandPrice(visaPrices, transaction, 2.99)).to.be.eq(2)
    })
    it('should price credit card transaction with 1 installments', () => {
      const transaction = withOneInstallment(creditTransaction())
      expect(getBrandPrice(visaPrices, transaction, 2.99)).to.be.eq(3)
    })
    it('should price credit card transaction with 2 installments', () => {
      const transaction = withTwoInstallments(creditTransaction())
      expect(getBrandPrice(visaPrices, transaction, 2.99)).to.be.eq(4)
    })
    it('should price credit card transaction with 10 installments', () => {
      const transaction = withTenInstallments(creditTransaction())
      expect(getBrandPrice(visaPrices, transaction, 2.99)).to.be.eq(5)
    })
  })
  context('getTransactionPricingByFeeRule', () => {
    it('should price boleto transaction using boleto_pricing pre-configured in the feeRule', () => {
      const feeRule = MockFeeRule()
      const transaction = boletoTransaction({ amount: 1000 })

      const mdr = getTransactionPricingByFeeRule(transaction, feeRule)

      expect(mdr.mdr_amount).to.be.eq(3)
      expect(mdr.mdr_type).to.be.eq(FLAT)
    })
    it('should price credit card transaction with 2 installments with default mdr', () => {
      const transaction = withTwoInstallments(creditTransaction())
      const feeRule = MockFeeRule()
      const mdr = getTransactionPricingByFeeRule(transaction, feeRule)

      expect(mdr).to.include({ mdr_type: PERCENTAGE, mdr_amount: 4 })
    })
    it('should price boleto transaction without boleto_pricing using default mdr', () => {
      const feeRule = feeRuleWithNoBrands()
      const transaction = boletoTransaction({ amount: 1000 })

      const mdr = getTransactionPricingByFeeRule(transaction, feeRule)

      expect(mdr.mdr_amount).to.be.eq(400)
      expect(mdr.mdr_type).to.be.eq(FLAT)
    })
  })
  context('getTransactionPricingByAffiliation', () => {
    it('should price boleto transaction using boleto_pricing pre-configured in the Affiliation', () => {
      const affiliation = generateAffiliation({
        boleto_pricing: { amount: 400, amount_type: FLAT }
      })
      const transaction = boletoTransaction({ amount: 1000 })

      const mdr = getTransactionPricingByAffiliation(transaction, affiliation)

      expect(mdr.mdr_amount).to.be.eq(400)
      expect(mdr.mdr_type).to.be.eq(FLAT)
    })
    it('should price credit card transaction with 2 installments with default mdr', () => {
      const transaction = withTwoInstallments(creditTransaction())
      const affiliation = generateAffiliation({
        with_costs: true
      })
      const mdr = getTransactionPricingByAffiliation(transaction, affiliation)

      expect(mdr).to.include({ mdr_type: PERCENTAGE, mdr_amount: 2 })
    })

    it('should price credit card transaction with elo pricing if brand not found', () => {
      const transaction = withTwoInstallments(creditTransaction())
      transaction.card.brand = 'blahblahcard'

      const affiliation = generateAffiliation({
        with_costs: true
      })

      const eloBrand = affiliation.costs.brands.find(
        ({ brand }) => brand === 'elo'
      )

      const mdr = getTransactionPricingByAffiliation(transaction, affiliation)

      expect(mdr).to.include({
        mdr_type: PERCENTAGE,
        mdr_amount: eloBrand.cost.credit_2
      })
    })

    it('should price boleto transaction without boleto_pricing using default mdr', () => {
      const affiliation = affiliationWithCostsAndNoBrands()
      const transaction = boletoTransaction({ amount: 1000 })

      const mdr = getTransactionPricingByAffiliation(transaction, affiliation)

      expect(mdr.mdr_amount).to.be.eq(300)
      expect(mdr.mdr_type).to.be.eq(FLAT)
    })
  })
})
