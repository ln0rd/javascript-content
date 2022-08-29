import { Pricing } from 'domain/model/pricing'
import { TransactionData } from 'domain/model/transaction-data'
import { CalculatePricingForTransaction } from './calculate-pricing-for-transaction'

export class CalculateBatch {
  async execute(transactionDatas: TransactionData[]): Promise<Pricing[]> {
    const calculate = new CalculatePricingForTransaction()
    const promises = transactionDatas.map((transactionData) =>
      calculate.execute(transactionData)
    )

    return Promise.all(promises)
  }
}
