import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { TransactionData } from 'domain/model/transaction-data'
import { Nullable } from 'helpers/types'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import { ChooseAnyRule } from './choose-any-rule'

export class ChooseHashRevenueRule extends ChooseAnyRule<HashRevenueRule> {
  async execute(
    identifier: TargetRuleIdentifier,
    transactionData: TransactionData
  ): Promise<Nullable<HashRevenueRule>> {
    return super.execute(
      identifier,
      transactionData,
      HashRevenueRulesRepository,
      'hash-revenue-rules'
    )
  }
}
