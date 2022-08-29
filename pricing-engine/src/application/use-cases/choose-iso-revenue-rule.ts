import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { TransactionData } from 'domain/model/transaction-data'
import { Nullable } from 'helpers/types'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'
import { ChooseAnyRule } from './choose-any-rule'

export class ChooseIsoRevenueRule extends ChooseAnyRule<IsoRevenueRule> {
  async execute(
    identifier: TargetRuleIdentifier,
    transactionData: TransactionData
  ): Promise<Nullable<IsoRevenueRule>> {
    return super.execute(
      identifier,
      transactionData,
      IsoRevenueRulesRepository,
      'iso-revenue-rules'
    )
  }
}
