import config from 'application/core/config'
import { bankResponder } from 'application/core/responders/bank'
import { createBanksClient } from '@hashlab/banks-client'

export default class BankService {
  static async getBanks() {
    const banksClient = await createBanksClient(config.services.banks_endpoint)
    const { banks } = await banksClient.list()

    const banksWithSort = banks.sort(
      bank => (config.main_banks.includes(bank.str_code) ? -1 : 1)
    )

    return bankResponder(banksWithSort)
  }
}
