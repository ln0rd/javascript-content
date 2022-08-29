import { Nullable } from 'helpers/types'
import { Pricing } from './pricing'
import { RevenueRule } from './revenue-rule'
import { TargetRuleIdentifier } from './target-rule-identifier'
import { TransactionData } from './transaction-data'

export abstract class StepCalculator {
  protected readonly pricing: Pricing

  protected readonly transactionData: TransactionData

  constructor(pricing: Pricing, transactionData: TransactionData) {
    this.pricing = pricing
    this.transactionData = transactionData
  }

  abstract calculate(...args: unknown[]): void

  protected findRevenueRuleForMerchantInSplit<T extends RevenueRule>(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<T>[],
    merchantId: string
  ): Nullable<T> {
    const ruleIndex = splitTargets.findIndex((t) => t.merchantId === merchantId)
    return rules[ruleIndex]
  }
}
