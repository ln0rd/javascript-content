export const affiliationWithoutCosts = () => ({})

export const affiliationWithCosts = () => ({
  costs: {
    anticipation_cost: 2,
    brands: [
      {
        brand: 'visa',
        cost: {
          debit: 1,
          credit_1: 2,
          credit_2: 4,
          credit_7: 6
        }
      }
    ]
  }
})

export const affiliationWithCostsAndNoBrands = () => ({
  costs: {
    anticipation_cost: 2,
    brands: []
  }
})
