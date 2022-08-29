import BigNumber from 'bignumber.js'
import { RuleIntegrityError } from 'errors/rule-integrity-error'
import throwIf from 'helpers/throw-if'
import { Nullable } from 'helpers/types'
import { Rule, RuleParams } from './rule'

export interface RevenueRuleParams extends RuleParams {
  percentage?: Nullable<number>
  flat?: Nullable<number>
}

export abstract class RevenueRule extends Rule {
  percentage: Nullable<number>

  flat: Nullable<number>

  constructor(params: RevenueRuleParams) {
    super(params)

    throwIf(
      this.ruleDoesNotHaveFlatOrPercentage(params),
      'Revenue Rule hasnt flat or percentage',
      RuleIntegrityError.errorConstructor
    )

    this.percentage = params.percentage
    this.flat = params.flat
  }

  protected calculate(amount: BigNumber): BigNumber {
    const percentage = new BigNumber(this.percentage ?? 0)
    const flat = new BigNumber(this.flat ?? 0)
    const oneHundred = new BigNumber(10000000)

    return amount.multipliedBy(percentage).dividedBy(oneHundred).plus(flat)
  }

  private ruleDoesNotHaveFlatOrPercentage(rule: RevenueRuleParams): boolean {
    return !rule.flat && !rule.percentage
  }
}
