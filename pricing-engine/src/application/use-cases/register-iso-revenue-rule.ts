import {
  IsoRevenueRule,
  IsoRevenueRuleParams,
} from 'domain/model/iso-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import logger from 'infrastructure/logger'
import { IsoRevenueRulesRepository } from 'infrastructure/repository/iso-revenue-rules-repository'

export class RegisterIsoRevenueRule {
  async execute(
    targetId: TargetRuleIdentifier,
    rules: IsoRevenueRuleParams[]
  ): Promise<IsoRevenueRule[]> {
    const isoRevenueRules = rules.map((rule) => {
      rule.isoId = targetId.isoId
      rule.merchantId = targetId.merchantId
      rule.pricingGroupId = targetId.pricingGroupId

      logger.info({ rule }, 'inserting-new-iso-revenue-rule')
      return new IsoRevenueRule(rule)
    })

    return IsoRevenueRulesRepository.insertMany(isoRevenueRules)
  }
}
