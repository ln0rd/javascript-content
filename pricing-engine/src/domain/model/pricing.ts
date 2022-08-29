import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { SplitRule } from 'domain/model/split-rule'
import { TransactionData } from 'domain/model/transaction-data'
import { Nullable } from 'helpers/types'
import { HashRevenueStepCalculator } from './hash-revenue-step-calculator'
import { InstallmentStepCalculator as InstallmentCalculator } from './installment-step-calculator'
import { IsoRevenueStepCalculator } from './iso-revenue-step-calculator'
import { NegativeValuesStepCalculator } from './negative-values-step-calculator'
import { SplitStepCalculator as SplitCalculator } from './split-step-calculator'
import { TargetRuleIdentifier } from './target-rule-identifier'

export interface RevenueDetail {
  merchantId: string
  installmentNumber?: number
  amount: number
}

export interface SplitDetail {
  merchantId: string
  installmentNumber: number
  splitAmount: number
  isoRevenueAmount?: number
}

export interface Pricing {
  transactionId: string
  isoRevenueDetail: RevenueDetail[]
  hashRevenueDetail: RevenueDetail[]
  splitDetail: SplitDetail[]
}

interface BuildStep {
  build(): Pricing
}

interface NegativeValuesStep {
  calculateNegativeValues(): BuildStep
}

interface HashRevenueStep {
  calculateHashRevenue(
    targets: TargetRuleIdentifier[],
    rules: Nullable<HashRevenueRule>[]
  ): NegativeValuesStep
}

interface IsoRevenueStep {
  calculateIsoRevenue(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<IsoRevenueRule>[]
  ): HashRevenueStep
}

interface InstallmentStep {
  calculateInstallments(): IsoRevenueStep
}

interface SplitStep {
  calculateSplits(rule: Nullable<SplitRule>): InstallmentStep
}

interface StepCalculatorClass<T> {
  new (pricing: Pricing, transactionData: TransactionData): T
}

export class PricingBuilder
  implements
    SplitStep,
    InstallmentStep,
    IsoRevenueStep,
    HashRevenueStep,
    NegativeValuesStep,
    BuildStep
{
  private pricing: Pricing

  private transactionData: TransactionData

  private constructor(transactionData: TransactionData) {
    this.transactionData = transactionData
    this.pricing = {
      transactionId: transactionData.id,
      isoRevenueDetail: [],
      hashRevenueDetail: [],
      splitDetail: [],
    }
  }

  static builder(transactionData: TransactionData): SplitStep {
    return new PricingBuilder(transactionData)
  }

  calculateSplits(rule: SplitRule): InstallmentStep {
    this.createCalculator(SplitCalculator).calculate(rule)

    return this
  }

  calculateInstallments(): IsoRevenueStep {
    this.createCalculator(InstallmentCalculator).calculate()

    return this
  }

  calculateIsoRevenue(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<IsoRevenueRule>[]
  ): HashRevenueStep {
    this.createCalculator(IsoRevenueStepCalculator).calculate(
      splitTargets,
      rules
    )

    return this
  }

  calculateHashRevenue(
    splitTargets: TargetRuleIdentifier[],
    rules: Nullable<HashRevenueRule>[]
  ): NegativeValuesStep {
    this.createCalculator(HashRevenueStepCalculator).calculate(
      splitTargets,
      rules
    )

    return this
  }

  calculateNegativeValues(): BuildStep {
    this.createCalculator(NegativeValuesStepCalculator).calculate()

    return this
  }

  build(): Pricing {
    return this.pricing
  }

  private createCalculator<T>(stepCalculatorClass: StepCalculatorClass<T>) {
    // eslint-disable-next-line new-cap
    return new stepCalculatorClass(this.pricing, this.transactionData)
  }
}
