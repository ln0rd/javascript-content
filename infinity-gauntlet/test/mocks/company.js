import R from 'ramda'

export const anticipation = type => ({
  anticipation_type: type,
  anticipation_days_interval: 10
})

export const costs = mdrs => ({
  costs: {
    anticipation_fee: 2,
    mdrs: mdrs || []
  }
})

export const mdr = () => ({
  payment_method: 'credit_card',
  installments: [
    {
      installment: 1,
      fee: 2,
      type: 'percentage'
    },
    {
      installment: 2,
      fee: 2,
      type: 'percentage'
    }
  ],
  card_brand: 'visa'
})

export const defaultSplitRules = {
  default_split_rules: [
    {
      company_id: 'uid_third',
      percentage: 60,
      charge_processing_cost: false
    }
  ]
}

//****************************************************************************************************************//

export const withMdrs = company => R.merge(company, costs([mdr()]))

export const withNoMdr = company => R.merge(company, costs())

export const withSpotAnticipation = company =>
  R.merge(company, anticipation('spot'))

export const withDefaultSplitRules = company =>
  R.merge(company, defaultSplitRules)

export const withAutomaticAnticipation = company =>
  R.merge(company, anticipation('automatic'))

//****************************************************************************************************************//

export const company = () => ({
  _id: 'uid',
  parent_id: 'parent'
})

export const companyWithAutomaticAnticipation = () =>
  R.compose(withAutomaticAnticipation)(company())

export const companyWithSpotAnticipation = () =>
  R.compose(withSpotAnticipation)(company())

export const companyWithDefaultSplitRules = () =>
  R.compose(withDefaultSplitRules)(company())

export const companyWithoutCosts = () => company()

export const companyWithCosts = () => R.compose(withMdrs)(company())

export const companyWithCostsAndNoMdr = () => R.compose(withNoMdr)(company())
