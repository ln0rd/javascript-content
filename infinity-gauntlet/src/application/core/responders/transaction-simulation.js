import R from 'ramda'
import { mapModel } from 'application/core/helpers/responder'

export function transactionSimulationResponder(model) {
  return mapModel(model, transaction => {
    return {
      object: 'transaction_simulation',
      anticipation_fee: transaction.anticipation_fee,
      anticipation_days_interval: transaction.anticipation_days_interval,
      requested_amount: transaction.requested_amount,
      company_id: transaction.company_id,
      simulations: R.map(simulation => {
        return {
          card_brand: simulation.card_brand,
          credit: R.map(
            installment => parseInstallments(installment),
            simulation.credit
          )
        }
      }, transaction.simulations)
    }
  })
}

function parseInstallments(installment) {
  return {
    installments: installment.installment,
    total_amount: installment.total_amount,
    installments_amount: installment.installments_amount,
    mdr: installment.mdr,
    mdr_amount: installment.mdr_value,
    anticipation_fee_amount: installment.fee
  }
}
