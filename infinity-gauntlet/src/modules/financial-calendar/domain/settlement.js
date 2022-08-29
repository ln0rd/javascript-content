import { BOLETO } from 'application/core/domain/methods'

function calculateSettlement(settlement, affiliationPayables) {
  const brands = {}
  const boleto = {
    payables: [],
    amount: 0
  }

  affiliationPayables.payables.forEach(payable => {
    const escrowed = payable.cip_escrowed_amount || 0
    settlement.cip_escrowed_amount += escrowed
    const payableLiquid =
      payable.amount - (payable.fee + payable.cost + escrowed)

    if (payable.payment_method === BOLETO) {
      boleto.payables.push(payable._id)
      boleto.amount += payableLiquid
      return
    }

    if (!brands[payable.card_brand]) {
      brands[payable.card_brand] = {
        brand: payable.card_brand,
        found: false,
        debit: 0,
        credit: 0,
        installment_credit: 0,
        anticipated_credit: 0,
        cip_escrowed_credit: 0,
        cip_escrowed_debit: 0
      }
    }

    const hasCIPEscrowedAmount =
      'cip_escrowed_amount' in payable && payable.cip_escrowed_amount > 0

    if (payable.payment_method === 'debit_card') {
      brands[payable.card_brand].debit += payableLiquid

      if (hasCIPEscrowedAmount) {
        brands[payable.card_brand].cip_escrowed_debit +=
          payable.cip_escrowed_amount
      }
    } else if (payable.original_payment_date) {
      brands[payable.card_brand].anticipated_credit += payableLiquid
    } else if (payable.total_installments > 1) {
      brands[payable.card_brand].installment_credit += payableLiquid
    } else {
      brands[payable.card_brand].credit += payableLiquid

      if (hasCIPEscrowedAmount) {
        brands[payable.card_brand].cip_escrowed_credit +=
          payable.cip_escrowed_amount
      }
    }
  })

  settlement.brands.forEach(brand => {
    if (brands[brand.brand]) {
      const currentBrand = brands[brand.brand]

      brand.debit += currentBrand.debit
      brand.credit += currentBrand.credit
      brand.installment_credit += currentBrand.installment_credit
      brand.anticipated_credit += currentBrand.anticipated_credit

      settlement.amount += currentBrand.debit
      settlement.amount += currentBrand.credit
      settlement.amount += currentBrand.installment_credit
      settlement.amount += currentBrand.anticipated_credit

      currentBrand.found = true
    }
  })

  Object.values(brands).forEach(brand => {
    if (!brand.found) {
      settlement.brands.push(brand)

      settlement.amount += brand.debit
      settlement.amount += brand.credit
      settlement.amount += brand.installment_credit
      settlement.amount += brand.anticipated_credit
    }
  })

  settlement.boleto.payables = settlement.boleto.payables
    ? settlement.boleto.payables.concat(boleto.payables)
    : boleto.payables

  const settlementBoletoAmount = settlement.boleto.amount || 0
  settlement.boleto.amount = settlementBoletoAmount + boleto.amount

  settlement.amount += boleto.amount
  return settlement
}

export default { calculateSettlement }
