import { mapModel } from 'application/core/helpers/responder'

export function walletBalanceResponder(model) {
  return mapModel(model, balance => {
    return {
      object: 'wallet_balance',
      wallet_id: balance.wallet_id || null,
      total_amount: balance.total_amount || 0,
      frozen_amount: balance.frozen_amount || 0,
      available_amount: balance.available_amount || 0,
      company_id: balance.company_id || null
    }
  })
}
