import { mapModel } from 'application/core/helpers/responder'
import {
  hasBoletoPricing,
  cardPricingResponder
} from 'application/core/domain/pricing'

export function feeRuleResponder(model) {
  return mapModel(model, feeRule => {
    let brands = feeRule.brands

    if (Array.isArray(brands)) {
      brands = brands.map(brand => ({
        brand: brand.brand,
        fee: cardPricingResponder(brand.fee)
      }))
    }

    return {
      object: 'fee_rule',
      id: feeRule._id || null,
      anticipation_fee: feeRule.anticipation_fee || null,
      anticipation_type: feeRule.anticipation_type || 'per_month',
      boleto_pricing: hasBoletoPricing(feeRule.boleto_pricing)
        ? feeRule.boleto_pricing
        : null,
      brands: brands || null,
      company_id: feeRule.company_id || null,
      created_at: feeRule.created_at || null,
      updated_at: feeRule.updated_at || null
    }
  })
}
