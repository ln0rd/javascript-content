export const aquirer = () => ({
  credentials: [
    {
      pricing: {
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
        ]
      }
    }
  ]
})

export const aquirerWithNoBrands = () => ({
  credentials: [
    {
      pricing: {
        brands: []
      }
    }
  ]
})
