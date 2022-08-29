import { RevenueDetail, SplitDetail } from './pricing'
import { StepCalculator } from './step-calculator'

export class NegativeValuesStepCalculator extends StepCalculator {
  calculate(): void {
    if (this.amountsShouldBeNegative()) {
      this.negateAmountsFromSplitDetail(this.pricing.splitDetail)
      this.negateAmountsFromRevenueDetail(this.pricing.isoRevenueDetail)
      this.negateAmountsFromRevenueDetail(this.pricing.hashRevenueDetail)
    }
  }

  private amountsShouldBeNegative(): boolean {
    return ['purchase-reversal', 'chargeback'].includes(
      this.transactionData.transactionType
    )
  }

  private negateAmountsFromSplitDetail(splitDetails: SplitDetail[]) {
    splitDetails.forEach((detail) => {
      detail.splitAmount *= -1
      detail.isoRevenueAmount = (detail.isoRevenueAmount as number) * -1
    })
  }

  private negateAmountsFromRevenueDetail(revenueDetails: RevenueDetail[]) {
    revenueDetails.forEach((detail) => {
      detail.amount *= -1
    })
  }
}
