import { mapModel } from 'application/core/helpers/responder'
import { walletBalanceResponder } from 'application/core/responders/wallet-balance'

export function walletTransferResponder(model, debug) {
  return mapModel(model, transfer => {
    const response = {
      object: 'wallet_transfer',
      id: transfer._id,
      transferred_amount: transfer.requested_amount,
      source_company: transfer.source_company,
      source_company_name: transfer.source_company_name,
      source_wallet_id: transfer.source_wallet_id || {},
      destination_wallet_id: transfer.destination_wallet_id,
      destination_company: transfer.destination_company || {},
      destination_company_name: transfer.destination_company_name,
      status: transfer.status,
      scheduled_to: transfer.scheduled_to || '',
      canceled_at: transfer.canceled_at || '',
      transferred_at: transfer.transferred_at || '',
      balances: parseBalances(transfer)
    }

    return debug
      ? Object.assign(response, {
          success_at: transfer.success_at,
          error_at: transfer.error_at,
          requester_ip_address: transfer.requester_ip_address,
          requester_company: transfer.requester_company || {},
          error: transfer.error,
          request_id: transfer.request_id
        })
      : response
  })

  function parseBalances(transfer) {
    if (transfer.balances) {
      const balances = {}

      if (transfer.balances.source) {
        balances.source = walletBalanceResponder(transfer.balances.source)
      }

      if (transfer.balances.destination) {
        balances.destination = walletBalanceResponder(
          transfer.balances.destination
        )
      }
      return balances
    }
  }
}
