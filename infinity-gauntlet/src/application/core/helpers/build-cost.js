import R from 'ramda'

export default function buildCost(mcc) {
  const brands = mcc.brands

  const result = {
    anticipation_fee: mcc.anticipation_cost,
    mdrs: []
  }

  R.forEach(brand => {
    const debitMdr = {
      capture_method: 'default',
      payment_method: 'debit_card',
      card_brand: brand.brand,
      installments: [
        {
          installment: 1,
          fee: brand.cost.debit
        }
      ]
    }

    const creditMdr = {
      capture_method: 'default',
      payment_method: 'credit_card',
      card_brand: brand.brand,
      installments: [
        {
          installment: 1,
          fee: brand.cost.credit_1
        },
        {
          installment: 2,
          fee: brand.cost.credit_2
        },
        {
          installment: 7,
          fee: brand.cost.credit_7
        }
      ]
    }

    result.mdrs.push(debitMdr)
    result.mdrs.push(creditMdr)
  }, brands)

  return result
}
