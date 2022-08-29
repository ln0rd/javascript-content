import BigNumber from 'bignumber.js'
import { RevenueRule } from './revenue-rule'
import { RoundingCalculator } from './rounding-calculator'

export class HashRevenueRule extends RevenueRule {
  calculateRevenue(splitAmount: number): number {
    const amount = new BigNumber(splitAmount)
    const revenue = this.calculate(amount)

    return RoundingCalculator.roundDown(revenue).toNumber()
  }
}
