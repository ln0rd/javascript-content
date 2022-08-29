import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { Pricing, PricingBuilder } from 'domain/model/pricing'
import { SplitRule } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { TransactionData } from 'domain/model/transaction-data'
import { Nullable } from 'helpers/types'
import { ChooseHashRevenueRule } from './choose-hash-revenue-rule'
import { ChooseIsoRevenueRule } from './choose-iso-revenue-rule'
import { ChooseSplitRule } from './choose-split-rule'

export class CalculatePricingForTransaction {
  async execute(transactionData: TransactionData): Promise<Pricing> {
    const identifier = this.extractIdentifierFromTransaction(transactionData)

    const splitRule = await this.chooseSplitRule(identifier, transactionData)

    const splitTargetIdentifiers = this.extractSplitTargetIdentifiers(
      splitRule,
      identifier
    )

    const splitIsoRevenueRules = await this.chooseIsoRevenueRules(
      splitTargetIdentifiers,
      transactionData
    )

    const splitHashRevenueRules = await this.chooseHashRevenueRules(
      splitTargetIdentifiers,
      transactionData
    )

    return PricingBuilder.builder(transactionData)
      .calculateSplits(splitRule)
      .calculateInstallments()
      .calculateIsoRevenue(splitTargetIdentifiers, splitIsoRevenueRules)
      .calculateHashRevenue(splitTargetIdentifiers, splitHashRevenueRules)
      .calculateNegativeValues()
      .build()
  }

  private extractIdentifierFromTransaction(
    transactionData: TransactionData
  ): TargetRuleIdentifier {
    return {
      isoId: transactionData.isoID,
      merchantId: transactionData.merchantID,
    }
  }

  private extractSplitTargetIdentifiers(
    splitRule: SplitRule,
    identifier: TargetRuleIdentifier
  ): TargetRuleIdentifier[] {
    return splitRule.instructions.map<TargetRuleIdentifier>((instruction) => ({
      isoId: identifier.isoId,
      merchantId: instruction.merchantId,
    }))
  }

  // FIXME move this condition to ChooseSplitRule
  private async chooseSplitRule(
    identifier: TargetRuleIdentifier,
    transactionData: TransactionData
  ): Promise<SplitRule> {
    const splitRule = await new ChooseSplitRule().execute(
      identifier,
      transactionData
    )

    return (
      splitRule ??
      SplitRule.createEmptySplitRule(identifier.merchantId as string)
    )
  }

  private async chooseHashRevenueRules(
    splitTargetIdentifiers: TargetRuleIdentifier[],
    transactionData: TransactionData
  ): Promise<Nullable<HashRevenueRule>[]> {
    return Promise.all(
      splitTargetIdentifiers.map((target) =>
        new ChooseHashRevenueRule().execute(target, transactionData)
      )
    )
  }

  private async chooseIsoRevenueRules(
    splitTargetIdentifiers: TargetRuleIdentifier[],
    transactionData: TransactionData
  ): Promise<Nullable<IsoRevenueRule>[]> {
    return Promise.all(
      splitTargetIdentifiers.map((target) =>
        new ChooseIsoRevenueRule().execute(target, transactionData)
      )
    )
  }
}
