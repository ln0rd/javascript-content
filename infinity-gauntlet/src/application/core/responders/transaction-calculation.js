import { mapModel } from 'application/core/helpers/responder'

export function transactionCalculationResponder(model) {
  return mapModel(model, data => {
    return {
      total_amount: data.totalAmount,
      type: data.type,
      installment: data.installment,
      installment_amount: data.installmentAmount,
      split_amount: data.splitAmount,
      mdr_fee: data.mdrFee,
      anticipation_fee: data.anticipationFee,
      net_amount: data.netAmount
    }
  })
}
