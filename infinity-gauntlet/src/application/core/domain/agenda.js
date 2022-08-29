import moment from 'moment'

export const DEFAULT_MDR = 3.99

/** Gets the mdr based on the brands configuration reducing
 * to a single number value
 *
 * @param transaction
 * @param brands
 * @returns number
 */
export function getMDR(transaction, brands) {
  return brands.reduce((mdr, brand) => {
    if (brand.brand === transaction.card.brand) {
      if (transaction.payment_method === 'debit_card') {
        return brand.fee.debit
      }

      if (transaction.payment_method === 'credit_card') {
        if (transaction.installments === 1) {
          return brand.fee.credit_1
        } else if (transaction.installments > 6) {
          return brand.fee.credit_7
        } else {
          return brand.fee.credit_2
        }
      }
    }
    return mdr
  }, DEFAULT_MDR)
}

/** Calculates the installment amount setting any unrounded value to the
 * first installment
 *
 * @param transaction
 * @param installment
 * @returns {number}
 */
export function installmentAmount(transaction, installment) {
  const baseAmount = Math.floor(transaction.amount / transaction.installments)
  return installment === 1
    ? transaction.amount - (transaction.installments - 1) * baseAmount
    : baseAmount
}

/** Calculates the installment payment date according to the transaction
 * payment method and the next business day.
 *
 * @param transaction
 * @param installment
 * @param nextBusinessDay
 * @returns {*}
 */
export function installmentPaymentDate(
  transaction,
  installment,
  nextBusinessDay
) {
  const createdAt = moment(new Date(transaction.captured_at))
  const paymentDate =
    transaction.payment_method === 'debit_card'
      ? createdAt.add(1, 'days')
      : createdAt.add(installment * 30, 'days')
  return nextBusinessDay(paymentDate)
}
