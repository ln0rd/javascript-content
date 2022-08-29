import { SplitDetail } from './pricing'
import { SplitRule } from './split-rule'
import { StepCalculator } from './step-calculator'

export class SplitStepCalculator extends StepCalculator {
  calculate(rule: SplitRule): void {
    const splits = rule.calculateSplits(this.transactionData.amount)

    this.pricing.splitDetail = splits.map<SplitDetail>((split) => ({
      installmentNumber: 1,
      merchantId: split.merchantId,
      splitAmount: split.amount,
    }))
  }
}
