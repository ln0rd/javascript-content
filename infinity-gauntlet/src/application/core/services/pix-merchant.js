import config from 'application/core/config'
import pixMerchantClient from '@hashlab/pix-merchant-client'

export default class PixMerchantService {
  static async createWithBankAccount(
    amount,
    destinationAccount,
    sourceId,
    sourceName
  ) {
    const client = await pixMerchantClient.createPixMerchantClient(
      config.services.pix_merchant_endpoint
    )
    const resp = await client.createWithBankAccount(
      amount,
      destinationAccount,
      sourceId,
      sourceName
    )

    client.closeClient()

    return resp.pix
  }
}
