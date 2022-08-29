export function chargeReceivable(amountToPay, receivable) {
  if (receivable <= 0) {
    return [amountToPay, receivable, 0]
  }
  if (receivable > amountToPay) {
    return [0, receivable - amountToPay, amountToPay]
  }
  if (amountToPay >= receivable) {
    return [amountToPay - receivable, 0, receivable]
  }
}

export function calculateByPaymentArrangement(brands, amount) {
  const [restAmount, payments] = brands.reduce(
    (
      [amount, payments],
      { debit, credit, installment_credit, anticipated_credit, brand }
    ) => {
      const [restDebit, newDebit, paidDebit] = chargeReceivable(amount, debit)
      const [restCredit, newCredit, paidCredit] = chargeReceivable(
        restDebit,
        credit
      )
      const [
        restInstallmentCredit,
        newInstallmentCredit,
        paidInstallmentCredit
      ] = chargeReceivable(restCredit, installment_credit)
      const [
        restAnticipatedCredit,
        newAnticipatedCredit,
        paidAnticipatedCredit
      ] = chargeReceivable(restInstallmentCredit, anticipated_credit)
      if (amount !== restAnticipatedCredit) {
        payments[brand.toString()] = {
          newDebit,
          paidDebit,
          newCredit,
          paidCredit,
          newInstallmentCredit,
          paidInstallmentCredit,
          newAnticipatedCredit,
          paidAnticipatedCredit
        }
      }
      return [restAnticipatedCredit, payments]
    },
    [amount, {}]
  )
  const newBrands = applyNewAmountForBrands(brands, payments)
  const paymentsByBrand = convertPaymentsToBrandArray(payments)
  return {
    restAmount,
    newBrands,
    paymentsByBrand
  }
}

export function convertPaymentsToBrandArray(payments) {
  const paymentsByBrand = []
  for (const brand of Object.keys(payments)) {
    const {
      paidDebit,
      paidCredit,
      paidInstallmentCredit,
      paidAnticipatedCredit
    } = payments[brand.toString()]

    paymentsByBrand.push({
      brand: brand,
      debit: paidDebit,
      credit: paidCredit,
      installment_credit: paidInstallmentCredit,
      anticipated_credit: paidAnticipatedCredit
    })
  }
  return paymentsByBrand
}

export function applyNewAmountForBrands(brands, payments) {
  return brands.map(brand => {
    if (!payments[brand.brand]) {
      return brand
    }
    const payment = payments[brand.brand]
    return Object.assign(brand, {
      debit: payment.newDebit,
      credit: payment.newCredit,
      installment_credit: payment.newInstallmentCredit,
      anticipated_credit: payment.newAnticipatedCredit
    })
  })
}
