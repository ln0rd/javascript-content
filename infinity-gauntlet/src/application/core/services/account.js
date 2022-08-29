import config from 'application/core/config'
import accountsClient from '@hashlab/account-client'
import ModelNotFoundError from 'framework/core/errors/model-not-found-error'
import { translate } from 'framework/core/adapters/i18n'

export default class AccountService {
  static async getAccountByCompanyId(company_id) {
    const client = await accountsClient.createAccountClient(
      config.services.accounts_endpoint
    )
    const resp = await client.getByRegistration(company_id)

    client.closeClient()

    return resp.account
  }

  static async getAccountByWalletId(wallet_id) {
    const client = await accountsClient.createAccountClient(
      config.services.accounts_endpoint
    )
    const resp = await client.getByBalance(wallet_id)

    client.closeClient()

    return resp.account
  }

  static checkAccount(locale, account) {
    if (!account && !account.balance_id) {
      throw new ModelNotFoundError(locale, translate('models.account', locale))
    }
  }
}
