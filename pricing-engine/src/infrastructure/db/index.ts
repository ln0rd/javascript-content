import { knex } from 'knex'
import * as pg from 'pg'
import knexConfig from '../../../config/knexfile'

const toNumber = (decimal: string) => Number(decimal)

// Use toNumber to decode the numeric fields from the database
;[
  pg.types.builtins.NUMERIC, // DECIMAL
  pg.types.builtins.FLOAT8, // DOUBLE/FLOAT
  pg.types.builtins.INT2, // TINYINT
  pg.types.builtins.INT4, // INT
  pg.types.builtins.INT8, // BIGINT
].forEach((type) => pg.types.setTypeParser(type, toNumber))

const db = knex(knexConfig)

export { db }
