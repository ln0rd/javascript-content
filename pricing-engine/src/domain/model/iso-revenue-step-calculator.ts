import isNotNull from 'helpers/is-not-null'
import { Nullable } from 'helpers/types'
import logger from 'infrastructure/logger'
import { IsoRevenueRule } from './iso-revenue-rule'
import { StepCalculator } from './step-calculator'
import { TargetRuleIdentifier } from './target-rule-identifier'

export class IsoRevenueStepCalculator extends StepCalculator {
  calculate(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<IsoRevenueRule>[]
  ): void {
    this.pricing.splitDetail.forEach((splitDetail) => {
      const rule = this.findRevenueRuleForMerchantInSplit(
        splitTargets,
        rules,
        splitDetail.merchantId
      )

      if (!isNotNull(rule)) {
        logger.warn('iso-revenue-rule-missing-in-pricing-calculation')
      }

      const isoRevenueAmount = isNotNull(rule)
        ? rule.calculateRevenue(
            this.transactionData.amount,
            splitDetail.splitAmount
          )
        : 0

      this.pricing.isoRevenueDetail.push({
        installmentNumber: splitDetail.installmentNumber,
        merchantId: splitDetail.merchantId,
        amount: isoRevenueAmount,
      })

      splitDetail.isoRevenueAmount = isoRevenueAmount
    })
  }
}
