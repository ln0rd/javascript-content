import {
  parseToRule,
  Rule as EngineRule,
  RuleEngine,
} from '@hashlab/rule-engine'
import { Rule } from 'domain/model/rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { TransactionData } from 'domain/model/transaction-data'
import * as dot from 'dot-object'
import isNotNull from 'helpers/is-not-null'
import { Nullable } from 'helpers/types'
import logger from 'infrastructure/logger'

export abstract class ChooseAnyRule<T extends Rule> {
  async execute(
    identifier: TargetRuleIdentifier,
    transactionData: TransactionData,
    repository: {
      findActiveRulesByTarget(
        id: TargetRuleIdentifier,
        activeAt: Date
      ): Promise<T[]>
    },
    logStringId: string
  ): Promise<Nullable<T>> {
    const log = logger.child({
      merchantId: identifier.merchantId,
      isoId: identifier.isoId,
      pricingGroupId: identifier.pricingGroupId,
      transactionData,
    })

    const rulesToSelectFrom = await repository.findActiveRulesByTarget(
      identifier,
      new Date(transactionData.dateTime)
    )

    if (!rulesToSelectFrom.length) {
      log.warn(`no-${logStringId}-to-select-from`)
      return null
    }

    const ruleSelectedForUse = this.selectMatchingRulesForTransaction(
      rulesToSelectFrom,
      transactionData
    )

    if (!ruleSelectedForUse.length) {
      log.warn(`no-applicable-${logStringId}`)
      return null
    }

    return this.pickMostSpecificRule(identifier, ruleSelectedForUse)
  }

  private selectMatchingRulesForTransaction(
    rules: T[],
    transactionData: TransactionData
  ): T[] {
    const ruleSet = this.convertToEngineRule(rules)

    const engine = new RuleEngine(ruleSet)
    const dataForComparison = dot.dot(transactionData)
    const applicableRules: EngineRule[] =
      engine.findApplicableRules(dataForComparison)

    if (!applicableRules.length) {
      return []
    }

    return this.selectOnlyApplicableRules(rules, applicableRules)
  }

  private convertToEngineRule(rules: T[]): EngineRule[] {
    return rules
      .map((rule) =>
        isNotNull(rule.id) ? parseToRule(rule.id, rule.matchingRule) : null
      )
      .filter((r): r is EngineRule => isNotNull(r))
  }

  private selectOnlyApplicableRules(
    rules: T[],
    engineRules: EngineRule[]
  ): T[] {
    return rules.filter((r) => engineRules.find((e) => r.id === e.id))
  }

  /**
   * When there is more than one rule for a given transaction, the most
   * specific one should be chosen. That means that if there is a rule for
   * this specific merchant, that rule will selected over all other rules.
   * If there is no merchant specific rule, the pricing group rule will be
   * used. The generic iso rule will be chosen if no other rule exists. In
   * short, the priority of the rule to be chosen is merchant then pricing
   * group then iso.
   *
   * @param identifier the TargetRuleIdntifier used to find specific rules
   * @param rules the list of Rules from which the most specific will be chosen
   * @returns the most specific rule for the target identifier
   */
  private pickMostSpecificRule(
    identifier: TargetRuleIdentifier,
    rules: T[]
  ): Nullable<T> {
    const merchantRule = rules.find(
      (rule) => rule.merchantId === identifier.merchantId
    )
    const pricingGroupRule = rules.find(
      (rule) => rule.pricingGroupId === identifier.pricingGroupId
    )
    const isoRule = rules.find((rule) => rule.isoId === identifier.isoId)

    return merchantRule || pricingGroupRule || isoRule
  }
}
