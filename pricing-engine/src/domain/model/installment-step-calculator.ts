import BigNumber from 'bignumber.js'
import { SplitDetail } from './pricing'
import { RoundingCalculator } from './rounding-calculator'
import { StepCalculator } from './step-calculator'

export class InstallmentStepCalculator extends StepCalculator {
  calculate(): void {
    const splitDetailsBeforeBaseInstallments = this.pricing.splitDetail
    this.cleanSplitDetailList()
    const numberOfInstallments =
      this.transactionData.installmentTransactionData?.installmentCount ?? 1
    splitDetailsBeforeBaseInstallments.forEach((splitDetail) => {
      this.createInstallmentsForSplit(splitDetail, numberOfInstallments)
    })
  }

  private createInstallmentsForSplit(
    splitDetail: SplitDetail,
    numberOfInstallments: number
  ) {
    const amount = new BigNumber(splitDetail.splitAmount)

    const baseInstallment = RoundingCalculator.roundDown(
      amount.dividedBy(numberOfInstallments)
    )

    const roundingDifference = RoundingCalculator.roundDown(amount).minus(
      baseInstallment.multipliedBy(numberOfInstallments)
    )

    const installmentNumbersList = Array.from(
      Array(numberOfInstallments).keys()
    )

    installmentNumbersList.forEach((_, index) => {
      this.pricing.splitDetail.push({
        merchantId: splitDetail.merchantId,
        installmentNumber: index + 1,
        splitAmount: baseInstallment.toNumber(),
      })
    })
    this.sumRoundingDifferenceInLastInstallment(roundingDifference.toNumber())
  }

  private cleanSplitDetailList() {
    this.pricing.splitDetail = []
  }

  private sumRoundingDifferenceInLastInstallment(roundingDifference: number) {
    this.pricing.splitDetail[this.pricing.splitDetail.length - 1].splitAmount +=
      roundingDifference
  }
}
