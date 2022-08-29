const assert = require('assert')

/**
 * This anticipation model uses the formula:
 * `(#parcelas - 1) * Taxa por parcela`
 * to calculate the anticipation fees of a installment.
 *
 * Please note that this model uses GROSS amounts to calculate the anticipation fee,
 * not the liquid amount. That means anticipation fees are calculated without the deduction of MDR fees.
 *
 * @see https://github.com/hashlab/product-development/issues/351
 * @see https://github.com/hashlab/financial-infrastructure/issues/13
 *
 * @param {Number} ruleAnticipationFee The Anticipation Fee from the Company's Fee Rule
 * @param {Number} amount The Gross amount of a installment
 * @param {Number} totalInstallments The total of installments of the Transaction
 */
function perAdditionalInstallmentAnticipationFee(
  ruleAnticipationFee,
  amount,
  totalInstallments
) {
  assert(totalInstallments >= 1, 'Total Installments must be at least 1')
  const baseAnticipationFee =
    ruleAnticipationFee / 100 * (totalInstallments - 1)

  const installmentAnticipationfee = Math.ceil(baseAnticipationFee * amount)

  return installmentAnticipationfee
}

function perInstallmentAnticipationFee(
  ruleAnticipationFee,
  liquidAmount,
  totalInstallments
) {
  assert(totalInstallments >= 1, 'Total Installments must be at least 1')
  const baseAnticipationFee = ruleAnticipationFee / 100 * totalInstallments

  const installmentAnticipationfee = Math.ceil(
    baseAnticipationFee * liquidAmount
  )

  return installmentAnticipationfee
}

module.exports = {
  perAdditionalInstallmentAnticipationFee,
  perInstallmentAnticipationFee
}
