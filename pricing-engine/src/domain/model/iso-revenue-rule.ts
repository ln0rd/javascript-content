import BigNumber from 'bignumber.js'
import { RevenueRule, RevenueRuleParams } from './revenue-rule'
import { RoundingCalculator } from './rounding-calculator'

export interface IsoRevenueRuleParams extends RevenueRuleParams {
  useSplitValues?: boolean
}

export class IsoRevenueRule extends RevenueRule {
  useSplitValues: boolean

  constructor(params: IsoRevenueRuleParams) {
    super(params)

    this.useSplitValues = params.useSplitValues ?? true
  }

  calculateRevenue(grossAmount: number, splitAmount: number): number {
    const amountToUse = this.useSplitValues ? splitAmount : grossAmount
    const amount = new BigNumber(amountToUse)
    const revenue = this.calculate(amount)
    const result = RoundingCalculator.roundUp(revenue).toNumber()

    if (result > splitAmount) {
      return splitAmount
    }

    if (result < 0) {
      return 0
    }

    return result
  }
}
