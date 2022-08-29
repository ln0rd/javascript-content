export const splitRuleAmount = num => ({
  amount: num,
  charge_processing_cost: true
})

export const splitRuleNoProcessingCost = num => ({
  amount: num,
  charge_processing_cost: false
})

export const splitRulePercentage = (percent, company_id = 'a') => ({
  percentage: percent,
  charge_processing_cost: true,
  company_id
})

export const splitRulesOnlyAmount = amount => [
  splitRuleAmount(amount / 2),
  splitRuleAmount(amount / 2)
]

export const splitRulesAmountNotOk = amount => [
  splitRuleAmount(amount),
  splitRuleAmount(amount)
]

export const splitRulesOnlyPercentage = () => [
  splitRulePercentage(50),
  splitRulePercentage(50)
]

export const splitRulesPercentageNotOk = () => [
  splitRulePercentage(10),
  splitRulePercentage(50)
]

export const splitRulesNoProcessingCost = amount => [
  splitRuleNoProcessingCost(amount / 2),
  splitRuleNoProcessingCost(amount / 2)
]
