import { Knex } from 'knex'

export const up = async (knex: Knex) => {
  return knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
}

export const down = async (knex: Knex) => {
  return knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp";')
}
