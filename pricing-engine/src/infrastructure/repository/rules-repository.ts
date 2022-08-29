/* eslint-disable @typescript-eslint/no-floating-promises */
/* 
This eslint rule is disabled because Knex.QueryBuilder has a `then` method. 
This rule detects if the return types has a `then` method and then fails. 
Source: https://github.com/typescript-eslint/typescript-eslint/issues/2640#issuecomment-704459007 
*/
import { TargetRuleIdentifier } from 'domain/model/target-rule-identifier'
import { db } from 'infrastructure/db'

export abstract class RulesRepository {
  static async activeRulesByTargetQuery(
    tableName: string,
    identifier: TargetRuleIdentifier,
    activeAt: Date
  ) {
    return db(tableName)
      .where((builder) => {
        if (identifier.isoId) builder.orWhere('iso_id', identifier.isoId)
        if (identifier.merchantId)
          builder.orWhere('merchant_id', identifier.merchantId)
        if (identifier.pricingGroupId)
          builder.orWhere('pricing_group_id', identifier.pricingGroupId)
      })
      .where('created_at', '<=', activeAt)
      .where((orBuilder) => {
        orBuilder.whereNull('deleted_at').orWhere('deleted_at', '>', activeAt)
      })
      .orderBy('created_at', 'desc')
  }
}
