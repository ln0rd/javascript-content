import { SplitRule, SplitRuleParams } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import logger from 'infrastructure/logger'
import { SplitRulesRepository } from 'infrastructure/repository/split-rules-repository'

export class RegisterSplitRule {
  async execute(
    targetId: TargetRuleIdentifier,
    rules: SplitRuleParams[]
  ): Promise<SplitRule[]> {
    const splitRules = rules.map((rule) => {
      rule.isoId = targetId.isoId
      rule.merchantId = targetId.merchantId
      rule.pricingGroupId = targetId.pricingGroupId

      logger.info({ rule }, 'inserting-new-split-rule')
      return new SplitRule(rule)
    })

    return SplitRulesRepository.insertMany(splitRules)
  }
}
