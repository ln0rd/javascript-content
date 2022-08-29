import { Knex } from 'knex'

export const up = async (knex: Knex) => {
  await knex.schema.createTable('hash_revenue_rules', (t) => {
    t.uuid('id')
      .primary('hash_revenue_rules_pkey')
      .defaultTo(knex.raw('uuid_generate_v4()'))

    t.text('iso_id')
    t.text('merchant_id')
    t.text('pricing_group_id')

    t.bigInteger('percentage')
    t.bigInteger('flat')

    t.jsonb('matching_rule').notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('deleted_at')
  })

  await knex.schema.raw(`
      ALTER TABLE hash_revenue_rules
      ADD CONSTRAINT hash_revenue_value_must_be_defined 
      CHECK (percentage IS NOT NULL OR flat IS NOT NULL)
    `)

  return knex.schema.raw(`
      ALTER TABLE hash_revenue_rules
      ADD CONSTRAINT hash_revenue_target_must_be_defined 
      CHECK (iso_id IS NOT NULL OR merchant_id IS NOT NULL OR pricing_group_id IS NOT NULL)
    `)
}

export const down = async (knex: Knex) => {
  return knex.schema.dropTable('hash_revenue_rules')
}
