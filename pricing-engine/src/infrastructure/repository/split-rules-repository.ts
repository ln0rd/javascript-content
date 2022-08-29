import { JsonObject } from '@hashlab/rule-engine'
import {
  SplitInstruction,
  SplitInstructionParams,
} from 'domain/model/split-instruction'
import { SplitRule } from 'domain/model/split-rule'
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { DatabaseCommunicationError } from 'errors/database-communication-error'
import isNotNull from 'helpers/is-not-null'
import { Nullable } from 'helpers/types'
import { db } from 'infrastructure/db'
import { isPostgresError } from 'infrastructure/helpers/is-postgres-error'
import { Knex } from 'knex'
import { RulesRepository } from './rules-repository'

interface SplitInstructionsRow {
  id?: string
  split_rule_id: string
  merchant_id: string
  percentage: number
  created_at?: Date
  deleted_at: Nullable<Date>
}

class SplitInstructionsRepository {
  private static readonly TABLE_NAME = 'split_instructions'

  static fromDB(row: SplitInstructionsRow): SplitInstructionParams {
    return {
      id: row.id,
      splitRuleId: row.split_rule_id,
      merchantId: row.merchant_id,
      percentage: row.percentage,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
    }
  }

  static toDB(splitInstruction: SplitInstruction): SplitInstructionsRow {
    return {
      split_rule_id: splitInstruction.splitRuleId as string,
      merchant_id: splitInstruction.merchantId,
      percentage: splitInstruction.percentage,
      deleted_at: splitInstruction.deletedAt,
    }
  }

  static async findBySplitRules(
    splitRuleIds: string[]
  ): Promise<SplitInstructionsRow[]> {
    return db(SplitInstructionsRepository.TABLE_NAME).whereIn(
      'split_rule_id',
      splitRuleIds
    )
  }

  static async insertMany(
    splitInstructions: SplitInstruction[],
    transaction: Knex.Transaction
  ): Promise<SplitInstruction[]> {
    const rows = splitInstructions.map((rule) =>
      SplitInstructionsRepository.toDB(rule)
    )

    const returned = await transaction(SplitInstructionsRepository.TABLE_NAME)
      .insert(rows)
      .returning(['id', 'created_at'])

    return splitInstructions.map((rule, index) => {
      rule.id = returned[index].id
      rule.createdAt = returned[index].created_at
      return rule
    })
  }
}

interface SplitRuleRow {
  id?: string
  iso_id: Nullable<string>
  merchant_id: Nullable<string>
  pricing_group_id: Nullable<string>
  matching_rule: JsonObject
  created_at?: Date
  deleted_at: Nullable<Date>
}

export class SplitRulesRepository extends RulesRepository {
  private static readonly TABLE_NAME = 'split_rules'

  static fromDB(
    splitRuleRow: SplitRuleRow,
    splitInstructionRows: SplitInstructionsRow[]
  ): SplitRule {
    const splitInstructions = splitInstructionRows
      .filter((row) => isNotNull(row))
      .map((row) => SplitInstructionsRepository.fromDB(row))

    return new SplitRule({
      id: splitRuleRow.id,
      isoId: splitRuleRow.iso_id,
      merchantId: splitRuleRow.merchant_id,
      pricingGroupId: splitRuleRow.pricing_group_id,
      matchingRule: splitRuleRow.matching_rule,
      createdAt: splitRuleRow.created_at,
      deletedAt: splitRuleRow.deleted_at,
      instructions: splitInstructions,
    })
  }

  static toDB(splitRule: SplitRule): SplitRuleRow {
    return {
      iso_id: splitRule.isoId,
      merchant_id: splitRule.merchantId,
      pricing_group_id: splitRule.pricingGroupId,
      matching_rule: splitRule.matchingRule,
      deleted_at: splitRule.deletedAt,
    }
  }

  static async findActiveRulesByTarget(
    identifier: TargetRuleIdentifier,
    activeAt: Date
  ): Promise<SplitRule[]> {
    const results = await SplitRulesRepository.activeRulesByTargetQuery(
      SplitRulesRepository.TABLE_NAME,
      identifier,
      activeAt
    )

    const ruleIds = results.map((result) => result.id)
    const instructionResults =
      await SplitInstructionsRepository.findBySplitRules(ruleIds)

    return results.map((rule) =>
      SplitRulesRepository.fromDB(
        rule,
        instructionResults.filter(
          (instruction) => rule.id === instruction.split_rule_id
        )
      )
    )
  }

  static async insertMany(splitRules: SplitRule[]): Promise<SplitRule[]> {
    const rows = splitRules.map((rule) => SplitRulesRepository.toDB(rule))

    try {
      await db.transaction(async (transaction) => {
        const returned = await transaction(SplitRulesRepository.TABLE_NAME)
          .insert(rows)
          .returning(['id', 'created_at'])

        splitRules.map((rule, index) => {
          rule.id = returned[index].id
          rule.createdAt = returned[index].created_at
          rule.instructions.forEach((instruction) => {
            instruction.splitRuleId = returned[index].id
          })
          return rule
        })

        const instructions = splitRules.flatMap((rule) => rule.instructions)
        await SplitInstructionsRepository.insertMany(instructions, transaction)
      })

      return splitRules
    } catch (e) {
      if (isPostgresError(e)) {
        throw e
      }

      throw new DatabaseCommunicationError(
        'Error to insert data in split rule tables'
      )
    }
  }
}
