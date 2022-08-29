import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { RevenueRuleParams } from 'domain/model/revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { HashRevenueRulesRepository } from 'infrastructure/repository/hash-revenue-rules-repository'
import logger from 'infrastructure/logger'

export class RegisterRevenueRule {
  async execute(
    targetId: TargetRuleIdentifier,
    rules: RevenueRuleParams[]
  ): Promise<HashRevenueRule[]> {
    const hashRevenueRule: HashRevenueRule[] = rules.map((rule) => {
      rule.isoId = targetId.isoId
      rule.merchantId = targetId.merchantId
      rule.pricingGroupId = targetId.pricingGroupId

      logger.info({ rule }, 'inserting-new-hash-revenue-rule')
      return new HashRevenueRule(rule)
    })

    return HashRevenueRulesRepository.insertMany(hashRevenueRule)
  }
}
