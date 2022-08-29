import BigNumber from 'bignumber.js'

export class RoundingCalculator {
  static roundUp(amount: BigNumber): BigNumber {
    return this.round(amount, BigNumber.ROUND_UP)
  }

  static roundDown(amount: BigNumber): BigNumber {
    return this.round(amount, BigNumber.ROUND_DOWN)
  }

  private static round(
    amount: BigNumber,
    roundingMode: BigNumber.RoundingMode
  ): BigNumber {
    return amount
      .dividedBy(1000)
      .decimalPlaces(0, roundingMode)
      .multipliedBy(1000)
  }
}
