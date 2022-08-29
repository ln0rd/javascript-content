import BigNumber from 'bignumber.js'
import { SplitInstructionError } from 'errors/split-instruction-error'
import throwIf from 'helpers/throw-if'
import { Nullable } from 'helpers/types'
import { RoundingCalculator } from './rounding-calculator'

export interface SplitInstructionParams {
  id?: Nullable<string>
  splitRuleId?: Nullable<string>
  merchantId: string
  percentage: number
  createdAt?: Nullable<Date>
  deletedAt?: Nullable<Date>
}

export class SplitInstruction {
  id: Nullable<string>

  splitRuleId: Nullable<string>

  merchantId: string

  percentage: number

  createdAt: Nullable<Date>

  deletedAt: Nullable<Date>

  constructor(params: SplitInstructionParams) {
    throwIf(
      this.missingMerchantId(params),
      'Missing merchantId',
      SplitInstructionError.errorConstructor
    )

    throwIf(
      this.missingPercentage(params),
      'Missing percentage',
      SplitInstructionError.errorConstructor
    )

    throwIf(
      this.percentageIsNotPositive(params),
      'Percentage should be a positive number',
      SplitInstructionError.errorConstructor
    )

    this.id = params.id
    this.splitRuleId = params.splitRuleId
    this.merchantId = params.merchantId
    this.percentage = params.percentage
    this.createdAt = params.createdAt
    this.deletedAt = params.deletedAt
  }

  calculateSplit(amount: number): number {
    const amountAsBigNumber = new BigNumber(amount)
    const percentage = new BigNumber(this.percentage)
    const oneHundred = new BigNumber(10000000)

    const splitAmount = amountAsBigNumber
      .multipliedBy(percentage)
      .dividedBy(oneHundred)

    return RoundingCalculator.roundDown(splitAmount).toNumber()
  }

  private percentageIsNotPositive(params: SplitInstructionParams): boolean {
    return params.percentage <= 0
  }

  private missingMerchantId(params: SplitInstructionParams): boolean {
    return !params.merchantId
  }

  private missingPercentage(params: SplitInstructionParams): boolean {
    return !params.percentage
  }
}
