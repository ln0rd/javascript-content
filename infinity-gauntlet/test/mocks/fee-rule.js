import faker from 'faker'
import { FLAT, PERCENTAGE } from 'application/core/domain/pricing'

export const feeRule = () => ({
  anticipation_fee: 2,
  anticipation_type: 'per_installment',
  company_id: `${faker.finance.account(14)}`,
  brands: [
    {
      brand: 'visa',
      fee: {
        debit: 1,
        credit_1: 2,
        credit_2: 4,
        credit_7: 6
      }
    }
  ],
  boleto_pricing: {
    amount: 3,
    amount_type: FLAT
  },
  iso_id: 'mongo_id'
})

export const feeRuleWithBoletoPricingBasedOnPercentage = () => ({
  anticipation_fee: 2,
  anticipation_type: 'per_installment',
  company_id: `${faker.finance.account(14)}`,
  brands: [
    {
      brand: 'visa',
      fee: {
        debit: 1,
        credit_1: 2,
        credit_2: 4,
        credit_7: 6
      }
    }
  ],
  boleto_pricing: {
    amount: 3,
    amount_type: PERCENTAGE
  }
})

export const feeRuleWithNoBrands = () => ({
  anticipation_fee: 2,
  anticipation_type: 'per_installment',
  brands: []
})
