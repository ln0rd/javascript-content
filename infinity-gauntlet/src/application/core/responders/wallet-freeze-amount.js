import { mapModel } from 'application/core/helpers/responder'

export function walletFreezeAmountResponder(model) {
  return mapModel(model, freezeAmount => {
    return {
      wallet_id: freezeAmount.wallet_id || null,
      frozen_amount_id: freezeAmount.frozen_amount_id || '',
      frozen_amount: freezeAmount.frozen_amount || 0
    }
  })
}
