import isNotNull from 'helpers/is-not-null'
import { Nullable } from 'helpers/types'
import logger from 'infrastructure/logger'
import { HashRevenueRule } from './hash-revenue-rule'
import { StepCalculator } from './step-calculator'
import { TargetRuleIdentifier } from './target-rule-identifier'

export class HashRevenueStepCalculator extends StepCalculator {
  calculate(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<HashRevenueRule>[]
  ): void {
    this.pricing.splitDetail.forEach((splitDetail) => {
      const rule = this.findRevenueRuleForMerchantInSplit(
        splitTargets,
        rules,
        splitDetail.merchantId
      )

      if (!isNotNull(rule)) {
        logger.warn('hash-revenue-rule-missing-in-pricing-calculation')
      }

      const hashRevenueAmount = isNotNull(rule)
        ? rule.calculateRevenue(splitDetail.splitAmount)
        : 0

      this.pricing.hashRevenueDetail.push({
        installmentNumber: splitDetail.installmentNumber,
        merchantId: splitDetail.merchantId,
        amount: hashRevenueAmount,
      })
    })
  }
}
