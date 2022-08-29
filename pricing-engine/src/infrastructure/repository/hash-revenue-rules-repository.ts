import { JsonObject } from '@hashlab/rule-engine'
import { HashRevenueRule } from 'domain/model/hash-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { Nullable } from 'helpers/types'
import { db } from 'infrastructure/db'
import { RulesRepository } from './rules-repository'

interface InsertReturn {
  id: string
  created_at: Date
}

interface HashRevenueRuleRow {
  id?: string
  iso_id: Nullable<string>
  merchant_id: Nullable<string>
  pricing_group_id: Nullable<string>
  percentage: Nullable<number>
  flat: Nullable<number>
  matching_rule: JsonObject
  created_at?: Date
  deleted_at: Nullable<Date>
}

export class HashRevenueRulesRepository extends RulesRepository {
  private static readonly TABLE_NAME: string = 'hash_revenue_rules'

  static fromDB(row: HashRevenueRuleRow): HashRevenueRule {
    return new HashRevenueRule({
      id: row.id,
      isoId: row.iso_id,
      merchantId: row.merchant_id,
      pricingGroupId: row.pricing_group_id,
      percentage: row.percentage,
      flat: row.flat,
      matchingRule: row.matching_rule,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    })
  }

  static toDB(hashRevenueRule: HashRevenueRule): HashRevenueRuleRow {
    return {
      iso_id: hashRevenueRule.isoId,
      merchant_id: hashRevenueRule.merchantId,
      pricing_group_id: hashRevenueRule.pricingGroupId,
      percentage: hashRevenueRule.percentage,
      flat: hashRevenueRule.flat,
      matching_rule: hashRevenueRule.matchingRule,
      deleted_at: hashRevenueRule.deletedAt,
    }
  }

  static async findActiveRulesByTarget(
    identifier: TargetRuleIdentifier,
    activeAt: Date
  ): Promise<HashRevenueRule[]> {
    const results = await HashRevenueRulesRepository.activeRulesByTargetQuery(
      HashRevenueRulesRepository.TABLE_NAME,
      identifier,
      activeAt
    )

    return results.map((r) => HashRevenueRulesRepository.fromDB(r))
  }

  static async insertMany(hashRevenueRule: HashRevenueRule[]) {
    const hashRevenueRuleListToDb: HashRevenueRuleRow[] = hashRevenueRule.map(
      (rule) => {
        return this.toDB(rule)
      }
    )

    let rulesInserted: InsertReturn[]

    try {
      rulesInserted = await db(HashRevenueRulesRepository.TABLE_NAME)
        .insert(hashRevenueRuleListToDb)
        .returning(['id', 'created_at'])
    } catch (error) {
      throw new DatabaseCommunicationError(
        `Error to insert data in ${HashRevenueRulesRepository.TABLE_NAME}`
      )
    }

    const hashRevenueRulesCreated: HashRevenueRule[] = rulesInserted.map(
      (ruleCreated, index) => {
        hashRevenueRule[index].id = ruleCreated.id
        hashRevenueRule[index].createdAt = ruleCreated.created_at

        return hashRevenueRule[index]
      }
    )

    return hashRevenueRulesCreated
  }
}
