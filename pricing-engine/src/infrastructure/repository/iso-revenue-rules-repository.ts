import { JsonObject } from '@hashlab/rule-engine'
import { IsoRevenueRule } from 'domain/model/iso-revenue-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import { Nullable } from 'helpers/types'
import { db } from 'infrastructure/db'
import { RulesRepository } from './rules-repository'

interface InsertReturn {
  id: string
  use_split_values: boolean
  created_at: Date
}

interface IsoRevenueRuleRow {
  id?: string
  iso_id: Nullable<string>
  merchant_id: Nullable<string>
  pricing_group_id: Nullable<string>
  percentage: Nullable<number>
  use_split_values: boolean
  flat: Nullable<number>
  matching_rule: JsonObject
  created_at?: Date
  deleted_at: Nullable<Date>
}

export class IsoRevenueRulesRepository extends RulesRepository {
  private static readonly TABLE_NAME: string = 'iso_revenue_rules'

  static fromDB(row: IsoRevenueRuleRow): IsoRevenueRule {
    return new IsoRevenueRule({
      id: row.id,
      isoId: row.iso_id,
      merchantId: row.merchant_id,
      pricingGroupId: row.pricing_group_id,
      percentage: row.percentage,
      useSplitValues: row.use_split_values,
      flat: row.flat,
      matchingRule: row.matching_rule,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    })
  }

  static toDB(isoRevenueRule: IsoRevenueRule): IsoRevenueRuleRow {
    return {
      iso_id: isoRevenueRule.isoId,
      merchant_id: isoRevenueRule.merchantId,
      pricing_group_id: isoRevenueRule.pricingGroupId,
      percentage: isoRevenueRule.percentage,
      use_split_values: isoRevenueRule.useSplitValues,
      flat: isoRevenueRule.flat,
      matching_rule: isoRevenueRule.matchingRule,
      deleted_at: isoRevenueRule.deletedAt,
    }
  }

  static async findActiveRulesByTarget(
    identifier: TargetRuleIdentifier,
    activeAt: Date
  ): Promise<IsoRevenueRule[]> {
    const results = await IsoRevenueRulesRepository.activeRulesByTargetQuery(
      IsoRevenueRulesRepository.TABLE_NAME,
      identifier,
      activeAt
    )

    return results.map((r) => IsoRevenueRulesRepository.fromDB(r))
  }

  static async insertMany(
    isoRevenueRules: IsoRevenueRule[]
  ): Promise<IsoRevenueRule[]> {
    const rows: IsoRevenueRuleRow[] = isoRevenueRules.map((rule) =>
      IsoRevenueRulesRepository.toDB(rule)
    )

    let returned: InsertReturn[]

    try {
      returned = await db(IsoRevenueRulesRepository.TABLE_NAME)
        .insert(rows)
        .returning(['id', 'use_split_values', 'created_at'])
    } catch (e) {
      throw new DatabaseCommunicationError(
        `Error to insert data in ${IsoRevenueRulesRepository.TABLE_NAME}`
      )
    }

    return isoRevenueRules.map((rule, index) => {
      rule.id = returned[index].id
      rule.useSplitValues = returned[index].use_split_values
      rule.createdAt = returned[index].created_at
      return rule
    })
  }
}
