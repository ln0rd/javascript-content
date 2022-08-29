import faker from 'faker'
import {
  BOLETO,
  CREDIT_CARD,
  DEBIT_CARD,
  ECOMMERCE,
  EMV
} from 'application/core/domain/methods'
import { FLAT } from 'application/core/domain/pricing'

/**
 * Generate Brand costs
 * @param {Array} costs
 * @return {{cost: {credit_7: number, credit_2: number, debit: number, credit_1: number, boleto: number}, brand: string}[]}
 */
const generateBrandCosts = costs =>
  ['visa', 'mastercard', 'hiper', 'diners', 'discover', 'aura', 'elo'].map(
    brand => {
      costs[brand.toString()] = costs[brand.toString()] || {
        debit: 2,
        credit_1: 2,
        credit_2: 2,
        credit_7: 2
      }
      return {
        brand,
        cost: {
          debit: costs[brand.toString()].debit || 2,
          credit_1: costs[brand.toString()].credit_1 || 2,
          credit_2: costs[brand.toString()].credit_2 || 2,
          credit_7: costs[brand.toString()].credit_7 || 2
        }
      }
    }
  )

const boletoPricing = {
  amount: 3,
  amount_type: FLAT
}

export default ({
  _id = `${faker.finance.account(14)}`,
  company_id = `${faker.finance.account(14)}`,
  merchant_id = `${faker.finance.account(14)}`,
  status = 'active',
  provider = 'hash',
  brand_costs = [],
  anticipation_cost = 2,
  with_costs = true,
  boleto_pricing = boletoPricing
}) => ({
  _id,
  company_id,
  merchant_id,
  iso_id: faker.finance.account(14),
  status,
  provider,
  costs: {
    anticipation_cost,
    brands: with_costs ? generateBrandCosts(brand_costs) : [],
    boleto_pricing
  },
  allowed_capture_methods: [EMV, ECOMMERCE],
  allowed_payment_methods: [CREDIT_CARD, DEBIT_CARD, BOLETO],
  _company_partial: {}
})
