import { JsonObject, parseToRule } from '@hashlab/rule-engine'
import { RuleIntegrityError } from 'errors/rule-integrity-error'
import { TargetIdentificationError } from 'errors/target-identification-error'
import isNotNull from 'helpers/is-not-null'
import throwIf from 'helpers/throw-if'
import { Nullable } from 'helpers/types'
import { TargetRuleIdentifier } from './target-rule-identifier'

export interface RuleParams extends TargetRuleIdentifier {
  id?: Nullable<string>
  matchingRule: JsonObject
  deletedAt?: Nullable<Date>
  createdAt?: Nullable<Date>
}

export abstract class Rule {
  id: Nullable<string>

  isoId: Nullable<string>

  merchantId: Nullable<string>

  pricingGroupId: Nullable<string>

  matchingRule: JsonObject

  createdAt: Nullable<Date>

  deletedAt: Nullable<Date>

  constructor(params: RuleParams) {
    throwIf(
      this.targetNotIdentified(params),
      'Rule target must be identified',
      TargetIdentificationError.errorConstructor
    )

    throwIf(
      this.targetHasMoreThanOneId(params),
      'Rule target must have only one identification',
      TargetIdentificationError.errorConstructor
    )

    const matchingRuleValidationResult = this.validateMatchingRule(params)

    throwIf(
      isNotNull(matchingRuleValidationResult),
      matchingRuleValidationResult as string,
      RuleIntegrityError.errorConstructor
    )

    this.id = params.id
    this.isoId = params.isoId
    this.merchantId = params.merchantId
    this.pricingGroupId = params.pricingGroupId
    this.matchingRule = params.matchingRule
    this.createdAt = params.createdAt
    this.deletedAt = params.deletedAt
  }

  private targetNotIdentified(rule: RuleParams): boolean {
    return !rule.isoId && !rule.merchantId && !rule.pricingGroupId
  }

  private targetHasMoreThanOneId(rule: RuleParams): boolean {
    const args: boolean[] = [
      !!rule.isoId,
      !!rule.merchantId,
      !!rule.pricingGroupId,
    ]

    return args.filter((a) => a).length > 1
  }

  private validateMatchingRule(rule: RuleParams): Nullable<string> {
    try {
      parseToRule('just-validate-please', rule.matchingRule)
      return null
    } catch (e) {
      return e.message
    }
  }
}
