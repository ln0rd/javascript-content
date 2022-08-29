import { Knex } from 'knex'

export const up = async (knex: Knex) => {
  await knex.schema.createTable('split_rules', (t) => {
    t.uuid('id')
      .primary('split_rules_pkey')
      .defaultTo(knex.raw('uuid_generate_v4()'))

    t.text('iso_id')
    t.text('merchant_id')
    t.text('pricing_group_id')

    t.jsonb('matching_rule').notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('deleted_at')
  })

  return knex.schema.createTable('split_instructions', (t) => {
    t.uuid('id')
      .primary('split_instructions_pkey')
      .defaultTo(knex.raw('uuid_generate_v4()'))

    t.uuid('split_rule_id').notNullable()
    t.text('merchant_id').notNullable()

    t.bigInteger('percentage').notNullable()

    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('deleted_at')

    t.foreign('split_rule_id').references('id').inTable('split_rules')
    t.index('split_rule_id')
  })
}

export const down = async (knex: Knex) => {
  await knex.schema.dropTable('split_instructions')

  return knex.schema.dropTable('split_rules')
}
