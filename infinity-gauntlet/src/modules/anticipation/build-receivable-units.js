/* eslint-disable security/detect-object-injection */
import moment from 'moment'
import { ReceivableUnit } from './domain/receivable-unit'

export function buildReceivableUnitsFromAggregation(payableData) {
  return payableData.reduce((units, payable) => {
    const cardBrand = payable.card_brand
    const originalPaymentDate = payable.payment_date
    const paymentMethod = payable.payment_method
    const isSameDay = moment().isSame(payable.created_at, 'day')

    const existingUnitIndex = units.findIndex(
      unit =>
        unit.originalPaymentDate === originalPaymentDate &&
        unit.cardBrand === cardBrand &&
        unit.paymentMethod === paymentMethod
    )

    if (existingUnitIndex >= 0) {
      units[existingUnitIndex].netAmountCents += payable.net_amount
      units[existingUnitIndex].payables.push(payable._id)

      if (isSameDay) {
        units[existingUnitIndex].notRegisteredCents += payable.net_amount
      }

      return units
    }

    const newUnit = new ReceivableUnit({
      cardBrand,
      paymentMethod,
      originalPaymentDate,
      payables: [payable._id],
      netAmountCents: payable.net_amount,
      notRegisteredCents: isSameDay ? payable.net_amount : 0
    })

    return units.concat(newUnit)
  }, [])
}
