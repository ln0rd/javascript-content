import { SplitInstructionError } from 'errors/split-instruction-error'
import throwIf from 'helpers/throw-if'
import { Rule, RuleParams } from './rule'
import { SplitInstruction, SplitInstructionParams } from './split-instruction'

export interface SplitRuleParams extends RuleParams {
  instructions: SplitInstructionParams[]
}

export interface Split {
  merchantId: string
  amount: number
}

export class SplitRule extends Rule {
  instructions: SplitInstruction[]

  constructor(params: SplitRuleParams) {
    super(params)

    throwIf(
      this.percentageSumIsNot100(params),
      'Percentages sum is not 100%',
      SplitInstructionError.errorConstructor
    )

    this.instructions = params.instructions.map(
      (inst) => new SplitInstruction(inst)
    )
  }

  calculateSplits(amount: number): Split[] {
    const splits = this.instructions.map<Split>((instruction) => ({
      merchantId: instruction.merchantId,
      amount: instruction.calculateSplit(amount),
    }))

    this.addLeftoverCentsInFirstSplit(amount, splits)

    return splits
  }

  private percentageSumIsNot100(params: SplitRuleParams): boolean {
    const sum = params.instructions.reduce(
      (acc, current) => acc + current.percentage,
      0
    )

    return sum !== 10000000
  }

  private addLeftoverCentsInFirstSplit(amount: number, splits: Split[]): void {
    const splitAmounts = splits.map((split) => split.amount)

    const leftover = this.calculateLeftoverBetween(amount, splitAmounts)

    splits[0].amount += leftover
  }

  private calculateLeftoverBetween(
    originalAmount: number,
    arrayOfAmounts: number[]
  ): number {
    const total = arrayOfAmounts.reduce(
      (sum, installment) => sum + installment,
      0
    )
    return originalAmount - total
  }

  static createEmptySplitRule(merchantId: string): SplitRule {
    return new SplitRule({
      merchantId,
      matchingRule: {},
      instructions: [
        {
          merchantId,
          percentage: 10000000,
        },
      ],
    })
  }
}
