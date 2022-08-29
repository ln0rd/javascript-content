import { SplitRule } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { TransactionData } from 'domain/model/transaction-data'
import { Nullable } from 'helpers/types'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'
import { ChooseAnyRule } from './choose-any-rule'

export class ChooseSplitRule extends ChooseAnyRule<SplitRule> {
  async execute(
    identifier: TargetRuleIdentifier,
    transactionData: TransactionData
  ): Promise<Nullable<SplitRule>> {
    return super.execute(
      identifier,
      transactionData,
      SplitRulesRepository,
      'split-rules'
    )
  }
}
